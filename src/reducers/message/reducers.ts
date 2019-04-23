import { CLEAR_MESSAGE_STATE, ADD_MESSAGE } from './types';

const initState = {
  message: '',
  isError: false
};


const messages = (state = initState, action) => {
  switch (action.type) {
    case CLEAR_MESSAGE_STATE:
      return initState;
    case ADD_MESSAGE: {
      return {...state, ...action};
    }
    default:
      return state;
  }
}
export default messages;
