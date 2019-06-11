import {
  ConseilMetadataClient,
  ConseilDataClient,
  ConseilQueryBuilder,
  ConseilOperator,
  ConseilOutput,
  ConseilSortDirection
} from 'conseiljs';
import base64url from 'base64url';
import {
  setAvailableValuesAction,
  setItemsAction,
  initDataAction,
  setLoadingAction,
  setNetworkAction,
  setColumnsAction,
  setAttributesAction,
  completeFullLoadAction,
  setFilterCountAction,
  setModalItemAction,
  setEntitiesAction,
  initEntityPropertiesAction,
  initFilterAction,
  setTabAction
} from './actions';
import { getConfigs } from '../../utils/getconfig';
import { Config, AttributeDefinition, Sort, Filter, EntityDefinition } from '../../types';

import { getTimeStampFromLocal, saveAttributes, validateCache } from '../../utils/attributes';
import { defaultQueries, CARDINALITY_NUMBER } from '../../utils/defaultQueries';
import { getOperatorType } from '../../utils/general';

const { executeEntityQuery } = ConseilDataClient;
const {
  blankQuery,
  addOrdering,
  addFields,
  setLimit,
  addPredicate,
} = ConseilQueryBuilder;

const CACHE_TIME = 432000000; // 5*24*3600*1000

let InitProperties: any = {};

const configs: Config[] = getConfigs();
const { getAttributes, getAttributeValues, getEntities } = ConseilMetadataClient;

const getConfig = (val: string) => configs.find(conf => conf.network === val);

const getAttributeNames = (attributes: AttributeDefinition[]) => attributes.map(attr => attr.name);

export const fetchValues = (attribute: string) => async (dispatch, state) => {
  const { selectedEntity, network, platform } = state().app;
  dispatch(setLoadingAction(true));
  const config = getConfig(network);
  const serverInfo = {
    url: config.url,
    apiKey: config.apiKey,
  };
  const values = await getAttributeValues(
    serverInfo,
    platform,
    network,
    selectedEntity,
    attribute
  );
  dispatch(setAvailableValuesAction(selectedEntity, attribute, values));
  dispatch(setLoadingAction(false));
};

const initCardinalityValues = (
  platform: string,
  entity: string,
  network: string,
  attribute: string,
  serverInfo: any
) => async dispatch => {
  const values = await getAttributeValues(
    serverInfo,
    platform,
    network,
    entity,
    attribute
  );
  await dispatch(setAvailableValuesAction(entity, attribute, values));
};

export const changeNetwork = (network: string) => async (dispatch, state) => {
  const oldNetwork = state().app.network;
  if (oldNetwork === network) return;
  localStorage.setItem('timestamp', '0');
  await dispatch(initDataAction());
  await dispatch(setNetworkAction(network));
  await dispatch(initLoad());
};

export const resetColumns = () => async (dispatch, state) => {
  const { selectedEntity } = state().app;
  const initProperty = InitProperties[selectedEntity];
  const columns = initProperty ? initProperty.columns : [];
  await dispatch(setColumnsAction(selectedEntity, columns));
};

export const resetFilters = () => async (dispatch, state) => {
  const { selectedEntity } = state().app;
  const initProperty = InitProperties[selectedEntity];
  const filters = initProperty ? initProperty.filters : [];
  await dispatch(initFilterAction(selectedEntity, filters));
};

export const fetchInitEntityAction = (
  platform: string,
  entity: string,
  network: string,
  serverInfo: any,
  attributes: AttributeDefinition[],
  urlEntity: string,
  urlQuery: string
) => async (dispatch: any) => {
  const defaultQuery = urlEntity === entity && urlQuery ? JSON.parse(base64url.decode(urlQuery)) : defaultQueries[entity];
  let columns: any[] = [];
  let sort: Sort;
  let filters: Filter[] = [];
  let cardinalityPromises: any[] = [];
  let query = blankQuery();

  if (defaultQuery) {
    const { fields, predicates, orderBy } = defaultQuery;
    query = defaultQuery;
    // initColumns
    if (fields.length > 0) {
      attributes.forEach(attribute => {
        if (fields.indexOf(attribute.name) >= 0) { columns.push(attribute); }
      });
    } else {
      attributes.forEach(attribute => columns.push(attribute));
    }

    sort = orderBy.map(o => { return { orderBy: o.field, order: o.direction } });

    // initFilters
    filters = predicates.map(predicate => {
      const selectedAttribute = attributes.find(attr => attr.name === predicate.field);
      const isLowCardinality = selectedAttribute.cardinality !== undefined && selectedAttribute.cardinality < CARDINALITY_NUMBER;
      if (isLowCardinality) {
        cardinalityPromises.push(
          dispatch(initCardinalityValues(platform, entity, network, selectedAttribute.name, serverInfo))
        );
      }
      const operatorType = getOperatorType(selectedAttribute.dataType);

      let operator = predicate.operation;
      if (predicate.inverse) {
        if (predicate.operation === ConseilOperator.ISNULL) {
          operator = 'isnotnull';
        } else if (predicate.operation === ConseilOperator.EQ) {
          operator = 'noteq';
        } else if (predicate.operation === ConseilOperator.STARTSWITH) {
          operator = 'notstartWith';
        } else if (predicate.operation === ConseilOperator.ENDSWITH) {
          operator = 'notendWith';
        } else if (predicate.operation === ConseilOperator.IN) {
            operator = 'notin';
          }
      }

      return {
        name: predicate.field,
        operator,
        values: predicate.set,
        operatorType,
        isLowCardinality
      };
    });

    // These values are used when reset columns or filters
    const initProperty = {
      columns, filters
    };
    InitProperties = {
      ...InitProperties,
      [entity]: initProperty
    };
  } else {
    columns = [...attributes];
    const levelColumn = columns.find(column => column.name === 'level' || column.name === 'block_level') || columns[0];
    sort = {
      orderBy: levelColumn.name,
      order: ConseilSortDirection.DESC
    };
    const attributeNames = getAttributeNames(columns);
    query = addFields(query, ...attributeNames);
    query = setLimit(query, 5000);
    query = addOrdering(query, sort.orderBy, sort.order);
  }

  const items = await executeEntityQuery(
    serverInfo,
    platform,
    network,
    entity,
    query
  );
  
  await dispatch(initEntityPropertiesAction(entity, filters, sort, columns, items));
  await Promise.all(cardinalityPromises);
};

export const initLoad = (urlEntity?: string, urlQuery?: string) => async (dispatch, state) => {
  const { network, platform } = state().app;
  const config = getConfig(network);
  const serverInfo = { url: config.url, apiKey: config.apiKey };

  let entities = await getEntities(serverInfo, platform, network);
    if (config.entities && config.entities.length > 0) {
        let filteredEntities: EntityDefinition[] = [];
        config.entities.forEach(e => {
            if (e === 'rolls') { return; }
            let match = entities.find(i => i.name === e);
            if (!!match) { filteredEntities.push(match); }
        });
        entities.forEach(e => {
            if (!config.entities.includes(e.name)) { filteredEntities.push(e); }
        });
        entities = filteredEntities;
    }

    entities.forEach(e => { if (e.displayNamePlural === undefined || e.displayNamePlural.length === 0) { e.displayNamePlural = e.displayName}}); // TODO: remove

  dispatch(setEntitiesAction(entities));
  if (urlEntity && urlQuery) {
    dispatch(setTabAction(urlEntity));
  }
  validateCache(2);
  const localDate = getTimeStampFromLocal();
  const currentDate = Date.now();
  if (currentDate - localDate > CACHE_TIME) {
    const attrPromises = entities.map(entity => dispatch(fetchAttributes(platform, entity.name, network, serverInfo)));
    await Promise.all(attrPromises);
    const { attributes } = state().app;
    saveAttributes(attributes, currentDate, 2);
  }
  const { attributes, selectedEntity } = state().app;
  await dispatch(
    fetchInitEntityAction(
      platform,
      selectedEntity,
      network,
      serverInfo,
      attributes[selectedEntity],
      urlEntity,
      urlQuery
    )
  );
  dispatch(completeFullLoadAction(true));
};

export const fetchAttributes = (
  platform: string,
  entity: string,
  network: string,
  serverInfo: any
) => async dispatch => {
  const attributes = await getAttributes(serverInfo, platform, network, entity);
  await dispatch(setAttributesAction(entity, attributes));
};

const getMainQuery = (attributeNames: string[], selectedFilters: Filter[], sort: Sort) => {
  let query = addFields(blankQuery(), ...attributeNames);
  selectedFilters.forEach((filter: Filter) => {
    if ((filter.operator === ConseilOperator.BETWEEN || filter.operator === ConseilOperator.IN || filter.operator === 'notin') && filter.values.length === 1) {
      return true;
    }

    if (filter.operator !== ConseilOperator.ISNULL && filter.operator !== 'isnotnull' && (filter.values.length === 0 || filter.values[0].length === 0)) {
        return true;
    }

    let isInvert = false;
    let operator: any = filter.operator;
    if (filter.operator === 'isnotnull') {
      isInvert = true;
      operator = ConseilOperator.ISNULL;
    } else if (filter.operator === 'noteq') {
      operator = ConseilOperator.EQ;
      isInvert = true;
    } else if (filter.operator === 'notstartWith') {
        operator = ConseilOperator.STARTSWITH;
        isInvert = true;
    } else if (filter.operator === 'notendWith') {
        operator = ConseilOperator.ENDSWITH;
        isInvert = true;
    } else if (filter.operator === 'notin') {
        operator = ConseilOperator.IN;
        isInvert = true;
    }

    query = addPredicate(query, filter.name, operator, filter.values, isInvert);
  });
  // Add this to set ordering
  query = addOrdering(
    query,
    sort.orderBy,
    sort.order
  );

  return query;
}

export const shareReport = () => async (dispatch, state) => {
  const { selectedEntity, columns, sort, selectedFilters } = state().app;
  const attributeNames = getAttributeNames(columns[selectedEntity]);
  let query = getMainQuery(attributeNames, selectedFilters[selectedEntity], sort[selectedEntity]);
  query = setLimit(query, 5000);
  const serializedQuery = JSON.stringify(query);
  const hostUrl = window.location.origin;
  const encodedUrl = base64url(serializedQuery);
  const shareLink = `${hostUrl}?e=${selectedEntity}&q=${encodedUrl}`;
  const textField = document.createElement('textarea')
  textField.innerText = shareLink;
  document.body.appendChild(textField);
  textField.select();
  document.execCommand('copy');
  textField.remove();
}

export const exportCsvData = () => async (dispatch, state) => {
  const { selectedEntity, platform, network, columns, sort, selectedFilters } = state().app;
  const config = getConfig(network);
  const serverInfo = {
    url: config.url,
    apiKey: config.apiKey,
  };

  const attributeNames = getAttributeNames(columns[selectedEntity]);
  let query = getMainQuery(attributeNames, selectedFilters[selectedEntity], sort[selectedEntity]);
  query = ConseilQueryBuilder.setOutputType(query, ConseilOutput.csv);

  const result: any = await executeEntityQuery(serverInfo, platform, network, selectedEntity, query);
  let blob = new Blob([result]);
  if (window.navigator.msSaveOrOpenBlob) {
    window.navigator.msSaveBlob(blob, 'arronax-results.csv');
  } else {
    const a = window.document.createElement("a");
    a.href = window.URL.createObjectURL(blob);
    a.download = 'arronax-results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

export const submitQuery = () => async (dispatch, state) => {
  dispatch(setLoadingAction(true));
  const { selectedEntity, selectedFilters, platform, network, columns, sort } = state().app;

  const config = getConfig(network);
  const attributeNames = getAttributeNames(columns[selectedEntity]);
  const serverInfo = { url: config.url, apiKey: config.apiKey };

  let query = getMainQuery(attributeNames, selectedFilters[selectedEntity], sort[selectedEntity]);
  query = setLimit(query, 5000);

  const items = await executeEntityQuery(serverInfo, platform, network, selectedEntity, query);
  await dispatch(setFilterCountAction(selectedFilters[selectedEntity].length));
  await dispatch(setItemsAction(selectedEntity, items));
  dispatch(setLoadingAction(false));
};

export const getItemByPrimaryKey = (entity: string, primaryKey: string, value: string | number) => async (dispatch: any, state: any) => {
  dispatch(setLoadingAction(true));

  const network = state().app.network;
  const sort = state().app.sort;
  const config = getConfig(network);
  const serverInfo = { url: config.url, apiKey: config.apiKey };

  let query = blankQuery();
  query = addPredicate(query, primaryKey, ConseilOperator.EQ, [value], false);
  query = addOrdering(query, sort[entity].orderBy, sort[entity].order);
  query = setLimit(query, 1);

  const items = await executeEntityQuery(serverInfo, state().app.platform, network, entity, query);

  await dispatch(setModalItemAction(items[0]));
  dispatch(setLoadingAction(false));
};

export const changeTab = (entity: string) => async (dispatch, state) => {
  const { network, platform, attributes, items } = state().app;
  const config = getConfig(network);
  const serverInfo = {
    url: config.url,
    apiKey: config.apiKey,
  };
  if(!items[entity] || (items[entity] && items[entity].length === 0)) {
    dispatch(setLoadingAction(true));
    await dispatch(
      fetchInitEntityAction(
        platform,
        entity,
        network,
        serverInfo,
        attributes[entity],
        '',
        ''
      )
    );
    dispatch(setLoadingAction(false));
  }
  dispatch(setTabAction(entity));
};
