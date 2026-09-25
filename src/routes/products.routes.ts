import { Router } from 'express'
import { handle } from '../lib/http.js'
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/products.controller.js'

export const productsRouter = Router()

productsRouter.get('/', handle(listProducts))
productsRouter.get('/:id', handle(getProduct))
productsRouter.post('/', handle(createProduct))
productsRouter.patch('/:id', handle(updateProduct))
productsRouter.delete('/:id', handle(deleteProduct))
