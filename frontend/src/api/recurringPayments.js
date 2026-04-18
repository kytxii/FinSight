import client from './client';
import * as demo from './demoStore';

const isDemo = () => localStorage.getItem('demo') === 'true';

export const getRecurringPayments   = ()         => isDemo() ? demo.getRecurringPayments()            : client.get('/recurring-payments/');
export const createRecurringPayment = (data)     => isDemo() ? demo.createRecurringPayment(data)      : client.post('/recurring-payments/', data);
export const updateRecurringPayment = (id, data) => isDemo() ? demo.updateRecurringPayment(id, data)  : client.patch(`/recurring-payments/${id}`, data);
export const deleteRecurringPayment = (id)       => isDemo() ? demo.deleteRecurringPayment(id)        : client.delete(`/recurring-payments/${id}`);
