import { Router } from 'express'
import { handle } from '../lib/http.js'
import { login } from '../controllers/auth.controller.js'

export const authRouter = Router()

authRouter.post('/login', handle(login))
