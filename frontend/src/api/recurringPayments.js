import client from './client';

export const getRecurringPayments  = ()         => client.get('/recurring-payments/');
export const createRecurringPayment = (data)    => client.post('/recurring-payments/', data);
export const updateRecurringPayment = (id, data) => client.patch(`/recurring-payments/${id}`, data);
export const deleteRecurringPayment = (id)      => client.delete(`/recurring-payments/${id}`);
