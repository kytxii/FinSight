import client from './client'

export const getTransactions = () => client.get('/transactions/')
export const createTransaction = (data) => client.post('/transactions/', data)
