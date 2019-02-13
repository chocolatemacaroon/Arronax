import { TezosConseilClient, ConseilMetadataClient } from 'conseiljs';
import {
  setItemsAction,
  initDataAction,
  setLoadingAction,
  setNetworkAction,
  setColumnsAction,
  setAttributesAction
} from './actions';
import getConfigs from '../../utils/getconfig';

const configs = getConfigs();
const { getBlocks, getOperations, getAccounts } = TezosConseilClient;
const { getAttributes, getAttributeValues } = ConseilMetadataClient;
const ConseilOperations = {
  blocks: getBlocks,
  operations: getOperations,
  accounts: getAccounts,
};


const getConfig = val => {
  return configs.find(conf => conf.value === val);
};

export const setItems = (type, items) => {
  return dispatch => {
    dispatch(setItemsAction(type, items));
  };
};

export const setColumns = (type, items) => {
  return dispatch => {
    dispatch(setColumnsAction(type, items));
  };
};

export const submitFilters = () => async (dispatch, state) => {
  dispatch(initDataAction());
  const network = state().app.network;
  const filters = state().app.filters;
  const entity = state().app.selectedEntity;
  dispatch(setLoadingAction(true));
  const config = getConfig(network);
  const serverInfo = {
    url: config.url,
<<<<<<< HEAD
    apiKey: config.key,
  };
  const items = await ConseilOperations[category](serverInfo, network, filters);
  dispatch(setItemsAction(category, items));
=======
    apiKey: config.key
  }
  const items = await ConseilOperations[entity](serverInfo, network, filters);
  dispatch(setItemsAction(entity, items));
>>>>>>> 01ebccb1ca46152990c33871d122860d989b9fa1
  dispatch(setLoadingAction(false));
};

export const changeNetwork = (network: string) => async (dispatch, state) => {
  const oldNetwork = state().app.network;
  if (oldNetwork === network) return;
  dispatch(initDataAction());
  dispatch(setNetworkAction(network));
  const filters = state().app.filters;
  const entity = state().app.selectedEntity;
  dispatch(setLoadingAction(true));
  const config = getConfig(network);
  const serverInfo = {
    url: config.url,
<<<<<<< HEAD
    apiKey: config.key,
  };
  const items = await ConseilOperations[category](serverInfo, network, filters);
  dispatch(setItemsAction(category, items));
=======
    apiKey: config.key
  }
  const items = await ConseilOperations[entity](serverInfo, network, filters);
  dispatch(setItemsAction(entity, items));
>>>>>>> 01ebccb1ca46152990c33871d122860d989b9fa1
  dispatch(setLoadingAction(false));
};

export const fetchItemsAction = (entity: string) => async (
  dispatch,
  state
) => {
  const network = state().app.network;
  const filters = state().app.filters;
  const originItems = state().app[entity];
  if (originItems.length > 0) return;
  dispatch(setLoadingAction(true));
  const config = getConfig(network);
  const serverInfo = {
    url: config.url,
<<<<<<< HEAD
    apiKey: config.key,
  };
  const items = await ConseilOperations[category](serverInfo, network, filters);
  dispatch(setItemsAction(category, items));
=======
    apiKey: config.key
  }
  const items = await ConseilOperations[entity](serverInfo, network, filters);
  dispatch(setItemsAction(entity, items));
  dispatch(setLoadingAction(false));
};

export const fetchAttributes = () => async (
  dispatch,
  state
) => {
  const network = state().app.network;
  const selectedEntity = state().app.selectedEntity;  
  dispatch(setLoadingAction(true));
  const config = getConfig(network);  
  const attributes = await getAttributes(config.url, config.key, 'tezos', network, selectedEntity);
  dispatch(setAttributesAction(selectedEntity, attributes));
>>>>>>> 01ebccb1ca46152990c33871d122860d989b9fa1
  dispatch(setLoadingAction(false));
};
