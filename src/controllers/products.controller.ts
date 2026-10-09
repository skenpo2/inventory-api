import type { Request, Response } from 'express';
import { HttpError, parseId } from '../lib/http.js';
import { prisma } from '../prisma.js';

function readBody(body: any) {
  const { sku, name, quantity, price } = body ?? {};
  return { sku, name, quantity, price };
}

export async function listProducts(req: Request, res: Response) {
  const products = await prisma.product.findMany({
    where: { orgId: req.membership.orgId },
    orderBy: { id: 'asc' },
  });
  res.json(products);
}

export async function createProduct(req: Request, res: Response) {
  const { sku, name, quantity, price } = readBody(req.body);

  if (!sku || !name || price === undefined) {
    throw new HttpError(400, 'sku, name and price are required');
  }

  const product = await prisma.product.create({
    data: {
      orgId: req.membership.orgId,
      sku,
      name,
      price,
      quantity: quantity ?? 0,
    },
  });
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const id = parseId(req.params.id);
  const { sku, name, quantity, price } = readBody(req.body);

  const product = await prisma.product.update({
    where: { id, orgId: req.membership.orgId },
    data: { sku, name, quantity, price },
  });
  res.json(product);
}

export async function deleteProduct(req: Request, res: Response) {
  const id = parseId(req.params.id);

  await prisma.product.delete({ where: { id, orgId: req.membership.orgId } });
  res.status(204).send();
}
