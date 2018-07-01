export const NEW_RIDE = 'NEW_RIDE';
export const BEGIN_NEGOTIATION = 'BEGIN_NEGOTIATION';
export const NEW_OFFER = 'NEW_OFFER';
export const CONFIRM_RIDE = 'CONFIRM_RIDE';

export const newMessage = (type, target, params) => ({ type, target, ...params });

export const newRideMessage = (start, end) => newMessage(NEW_RIDE, undefined, { start, end });
export const isNewRideMessage = (message) => message.type === NEW_RIDE;

export const beginNegotiationMessage = (target, topic) =>
  newMessage(BEGIN_NEGOTIATION, target, { topic });
export const isBeginNegotiationMessage = (message) => message.type === BEGIN_NEGOTIATION;

export const newOfferMessage = (target, offer) => newMessage(NEW_OFFER, target, { offer });
export const isNewOfferMessage = (message) => message.type === NEW_OFFER;

export const confirmRideMessage = (target) => newMessage(CONFIRM_RIDE, target);
export const isConfirmRideMessage = (message) => message.type === CONFIRM_RIDE;
