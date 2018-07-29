export const NEW_RIDE = 'NEW_RIDE';
export const BEGIN_NEGOTIATION = 'BEGIN_NEGOTIATION';
export const NEW_OFFER = 'NEW_OFFER';
export const CONFIRM_PRICE = 'CONFIRM_PRICE';
export const PENDING_SELECTION = 'PENDING_SELECTION';
export const CONFIRM_RIDE = 'CONFIRM_RIDE';

export const newMessage = (type, target, params) => ({ type, target, ...params });

export const newRideMessage = (start, end) => newMessage(NEW_RIDE, undefined, { start, end });
export const isNewRideMessage = (message) => message.type === NEW_RIDE;

export const beginNegotiationMessage = (target, topic) =>
  newMessage(BEGIN_NEGOTIATION, target, { topic });
export const isBeginNegotiationMessage = (message) => message.type === BEGIN_NEGOTIATION;

export const newOfferMessage = (target, price) => newMessage(NEW_OFFER, target, { price });
export const isNewOfferMessage = (message) => message.type === NEW_OFFER;

export const confirmPriceMessage = (target, price) => newMessage(CONFIRM_PRICE, target, { price });
export const isConfirmPriceMessage = (message) => message.type === CONFIRM_PRICE;

export const pendingSelectionMessage = (target, price) =>
  newMessage(PENDING_SELECTION, target, { price });
export const isPendingSelectionMessage = (message) => message.type === PENDING_SELECTION;

export const confirmRideMessage = (target, price) => newMessage(CONFIRM_RIDE, target, { price });
export const isConfirmRideMessage = (message) => message.type === CONFIRM_RIDE;
