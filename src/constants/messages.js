const Message = {
  AVAILABLE_LIST: 'available_list',
  USER_CONNECTED: 'user_connected',
  USER_DISCONNECTED: 'user_disconnected',

  // STATE USER SELECT
  US_LOGIN: 'login',
  US_CHALLENGE: 'us_challenge',
  US_CHALLENGE_CANCEL: 'us_challenge_cancel',
  US_CHALLENGE_RESPONSE: 'us_challenge_response',
  US_GET_USER_LIST: 'us_get_user_list',

  // STATE GAME SETUP
  GS_DONE_SETUP: 'gs_done_setup',

  // STATE IN GAME
  IG_ATTACK: 'ig_attack',
  IG_ATTACK_RESPONSE: 'ig_attack_response',
  IG_RESIGN: 'ig_resign',
  IG_PLANES: 'ig_planes',
  IG_ENDGAME: 'ig_endgame',
  IG_CHAT: 'ig_chat'
};

export default Message;
