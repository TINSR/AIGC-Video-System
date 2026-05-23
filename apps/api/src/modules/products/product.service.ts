import prisma from '../../config/prisma';

type ProductRecord = Awaited<ReturnType<typeof prisma.product.findMany>>[number];

interface CreateProductData {
  title: string;
  category: string;
  sellingPoints: string[];
  targetAudience: string;
  usageScene: string;
}

export const createProduct = async (data: CreateProductData) => {
  const product = await prisma.product.create({
    data: {
      ...data,
      sellingPoints: JSON.stringify(data.sellingPoints),
    },
  });

  return {
    ...product,
    sellingPoints: JSON.parse(product.sellingPoints),
  };
};

export const getProducts = async () => {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return products.map((product: ProductRecord) => ({
    ...product,
    sellingPoints: JSON.parse(product.sellingPoints),
  }));
};

export const getProductById = async (id: string) => {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { materials: true, creativePlans: true, tasks: true },
  });

  if (!product) return null;

  return {
    ...product,
    sellingPoints: JSON.parse(product.sellingPoints),
  };
};

export const updateProduct = async (id: string, data: Partial<CreateProductData>) => {
  const updateData: any = { ...data };
  if (data.sellingPoints) {
    updateData.sellingPoints = JSON.stringify(data.sellingPoints);
  }

  const product = await prisma.product.update({
    where: { id },
    data: updateData,
  });

  return {
    ...product,
    sellingPoints: JSON.parse(product.sellingPoints),
  };
};
