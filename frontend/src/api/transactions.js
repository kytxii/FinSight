import client from './client'
import * as demo from './demoStore'

const isDemo = () => localStorage.getItem('demo') === 'true'

export const getTransactions    = ()         => isDemo() ? demo.getTransactions()           : client.get('/transactions/')
export const createTransaction  = (data)     => isDemo() ? demo.createTransaction(data)     : client.post('/transactions/', data)
export const updateTransaction  = (id, data) => isDemo() ? demo.updateTransaction(id, data) : client.patch(`/transactions/${id}`, data)
export const deleteTransaction  = (id)       => isDemo() ? demo.deleteTransaction(id)       : client.delete(`/transactions/${id}`)
