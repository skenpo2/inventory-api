import type { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { HttpError, parseId } from '../lib/http.js';

// The three writable fields, pulled off the body so a request can't set
// id/createdAt/updatedAt by sneaking them in.
function readBody(body: any) {
  const { sku, name, quantity, price } = body ?? {};
  return { sku, name, quantity, price };
}

// GET /products
export async function listProducts(_req: Request, res: Response) {
  const products = await prisma.product.findMany({ orderBy: { id: 'asc' } });
  res.json(products);
}

// GET /products/:id
export async function getProduct(req: Request, res: Response) {
  const id = parseId(req.params.id);

  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) throw new HttpError(404, 'Product not found');
  res.json(product);
}

// POST /products
export async function createProduct(req: Request, res: Response) {
  const { sku, name, quantity, price } = readBody(req.body);

  if (!sku || !name || price === undefined) {
    throw new HttpError(400, 'sku, name and price are required');
  }

  const product = await prisma.product.create({
    data: { sku, name, price, quantity: quantity ?? 0 },
  });
  res.status(201).json(product);
}

// PATCH /products/:id
// Only the fields present in the body get written, so a stock update can send
// just { quantity } without wiping the rest of the row.
export async function updateProduct(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const { sku, name, quantity, price } = readBody(req.body);

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(sku !== undefined && { sku }),
      ...(name !== undefined && { name }),
      ...(quantity !== undefined && { quantity }),
      ...(price !== undefined && { price }),
    },
  });
  res.json(product);
}

// DELETE /products/:id
export async function deleteProduct(req: Request, res: Response) {
  const id = parseId(req.params.id);
  await prisma.product.delete({ where: { id } });
  res.status(204).send();
}
