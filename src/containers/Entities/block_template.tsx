import React from 'react';
import { withTranslation, WithTranslation } from 'react-i18next';
import { connect } from 'react-redux';
import Modal from '@material-ui/core/Modal';

import { formatValueForDisplay } from '../../utils/render';
import Loader from '../../components/Loader';

import { gotoOperationsForBlockThunk } from '../../reducers/app/thunks';

import {
  ScrollContainer, ModalContainer, ListContainer,
  CloseIcon, ModalTitle, RowContainer, TitleTxt,
  ContentTxt, ButtonContainer, CloseButton,
  GotoOpBtn
} from './style';

type OwnProps = {
  open: boolean;
  items: any[];
  attributes: any[];
  isLoading: boolean;
  title: string;
  onClose: () => void;
  gotoOperations: (id: string) => any;
};

interface States {
  count: number;
}

type Props = OwnProps & WithTranslation;

class EntityModal extends React.Component<Props, States> {
  explicitKeys: string[] = [];

  constructor(props) {
    super(props);
    this.state = { count: 0 };
  }

  changeCount = (count: number) => { this.setState({count}); }

  onClickModal = (event: any) => { event.stopPropagation(); }

  formatValue = (processedValues: any[], attributes: any[], key: string) => {
    this.explicitKeys.push(key);
    if (processedValues.find(i => i.name === key) === undefined) { return ''; }
    return formatValueForDisplay('platform', 'network', 'operations', processedValues.find(i => i.name === key).value, attributes.filter(a => a.name === key)[0], undefined, undefined);
  }

  onGotoAllOperations(hash) {
    const { gotoOperations, onClose } = this.props;
    gotoOperations(hash);
    onClose();
  }

  render() {
    const { open, items, attributes, isLoading, onClose, title, t } = this.props;
    const { count } = this.state;
    const total = items ? items.length : 0;

    const processedValues = attributes
      .filter(c => total > 0 && items[count][c.name] != null && items[count][c.name] !== undefined)
      .sort((a, b) => {
          if (a.displayOrder === undefined && b.displayOrder === undefined) {
              if(a.displayName < b.displayName) { return -1; }
              if(a.displayName > b.displayName) { return 1; }
          }

          if (a.displayOrder === undefined && b.displayOrder !== undefined){
              return 1;
          }

          if (a.displayOrder !== undefined && b.displayOrder === undefined){
              return -1;
          }

          return a.displayOrder - b.displayOrder;
      }).map(c => {
        return { displayName: c.displayName, value: items[count][c.name], name: c.name, entity: c.entity };
      });

      this.explicitKeys = [];

    return (
      <Modal open={open}>
        <ScrollContainer onClick={onClose}>
          <ModalContainer onClick={(event) => this.onClickModal(event)}>
            <CloseIcon onClick={onClose} size="19px" color="#9b9b9b" iconName="icon-close" />
              <ModalTitle>
                {(processedValues.find(i => i.name === 'script') === undefined) && (
                  t('components.entityModal.details', {title})
                )}
              </ModalTitle>

              {isLoading && <Loader />}

              {!isLoading && (
                <ListContainer>
                  <RowContainer>
                    <TitleTxt>{t('attributes.blocks.hash')}</TitleTxt>
                    <ContentTxt>{this.formatValue(processedValues, attributes, 'hash')} {t('components.entityModal.at')} {this.formatValue(processedValues, attributes, 'level')} ({this.formatValue(processedValues, attributes, 'meta_cycle_position')}) {t('components.entityModal.of')} {this.formatValue(processedValues, attributes, 'meta_cycle')}</ContentTxt>
                  </RowContainer>

                  <RowContainer>
                    <TitleTxt>{t('attributes.blocks.baker')}</TitleTxt>
                    <ContentTxt>{this.formatValue(processedValues, attributes, 'baker')} {t('components.entityModal.of')} {this.formatValue(processedValues, attributes, 'priority')}</ContentTxt>
                  </RowContainer>

                  <RowContainer>
                    <TitleTxt>{t('attributes.blocks.protocol')}</TitleTxt>
                    <ContentTxt>{this.formatValue(processedValues, attributes, 'proto')}: {this.formatValue(processedValues, attributes, 'protocol')}</ContentTxt>
                  </RowContainer>

                  <RowContainer>
                    <TitleTxt>{t('general.nouns.period')}</TitleTxt>
                    <ContentTxt>{this.formatValue(processedValues, attributes, 'meta_voting_period')}: {this.formatValue(processedValues, attributes, 'period_kind')}, {this.formatValue(processedValues, attributes, 'meta_voting_period_position')} {this.formatValue(processedValues, attributes, 'expected_commitment')} {this.formatValue(processedValues, attributes, 'current_expected_quorum')}</ContentTxt>
                  </RowContainer>

                  {processedValues.filter(i => !(this.explicitKeys.includes(i.name))).map((item, index) => {
                    const { entity, name } = item;
                    return (
                      <RowContainer key={index}>
                        <TitleTxt>{t(`attributes.${entity}.${name}`)}</TitleTxt>
                        <ContentTxt>{this.formatValue(processedValues, attributes, name)}</ContentTxt>
                      </RowContainer>
                    );
                  })}
                  <GotoOpBtn onClick={() => this.onGotoAllOperations(items[0].hash)}>All Operations >></GotoOpBtn>
                </ListContainer>
              )}
              <ButtonContainer>
                <CloseButton onClick={onClose}>
                  {t('general.verbs.close')}
                </CloseButton>
              </ButtonContainer>
          </ModalContainer>
        </ScrollContainer>
      </Modal>
    );
  }
};

const mapDispatchToProps = (dispatch: any) => ({
  gotoOperations: (id: string) => dispatch(gotoOperationsForBlockThunk(id))
});


export default connect(
  null,
  mapDispatchToProps
)(withTranslation()(EntityModal));