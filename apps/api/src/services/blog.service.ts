import type { Prisma, BlogPostStatus } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import { markdownToHtml } from './blog/markdown.js';
import { readingTime } from './blog/reading-time.js';
import { paginationMeta } from '../utils/pagination.js';

const POST_INCLUDE = {
  category: {
    select: { id: true, nameAr: true, nameEn: true, slug: true },
  },
  author: {
    select: { id: true, name: true },
  },
  products: {
    include: {
      product: {
        select: {
          id: true,
          slug: true,
          sku: true,
          nameAr: true,
          nameEn: true,
          price: true,
          stock: true,
          isActive: true,
          images: {
            take: 1,
            orderBy: { sortOrder: 'asc' },
            select: { url: true },
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  },
} satisfies Prisma.BlogPostInclude;

export interface BlogPostListItem {
  id: string;
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string | null;
  excerptEn: string | null;
  coverImageUrl: string | null;
  coverAltAr: string | null;
  coverAltEn: string | null;
  category: { id: string; nameAr: string; nameEn: string; slug: string } | null;
  tags: string[];
  status: BlogPostStatus;
  publishedAt: Date | null;
  readingTimeMinutes: number;
  viewCount: number;
  createdAt: string;
}

export interface BlogPostDetail extends BlogPostListItem {
  contentAr: string;
  contentEn: string;
  contentHtmlAr: string;
  contentHtmlEn: string;
  seoTitleAr: string | null;
  seoTitleEn: string | null;
  seoDescriptionAr: string | null;
  seoDescriptionEn: string | null;
  author: { id: string; name: string | null } | null;
  relatedProducts: Array<{
    id: string;
    slug: string;
    sku: string;
    nameAr: string;
    nameEn: string;
    price: number;
    stock: number;
    isActive: boolean;
    primaryImage: string | null;
  }>;
}

interface ListFilters {
  category?: string;
  tag?: string;
  q?: string;
  status?: BlogPostStatus;
  page?: number;
  pageSize?: number;
  lang?: 'ar' | 'en';
}

export async function listBlogPosts(filters: ListFilters) {
  const {
    category,
    tag,
    q,
    status = 'PUBLISHED',
    page = 1,
    pageSize = 10,
    lang = 'en',
  } = filters;
  const where: Prisma.BlogPostWhereInput = { status };
  if (category) {
    where.category = { slug: category };
  }
  if (tag) {
    where.tags = { has: tag };
  }
  if (q) {
    const contains = q;
    where.OR = [
      { titleAr: { contains, mode: 'insensitive' } },
      { titleEn: { contains, mode: 'insensitive' } },
      { excerptAr: { contains, mode: 'insensitive' } },
      { excerptEn: { contains, mode: 'insensitive' } },
    ];
  }

  const offset = (page - 1) * pageSize;
  const [total, posts] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      include: POST_INCLUDE,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: pageSize,
    }),
  ]);

  return {
    posts: posts.map((p) => toListItem(p, lang)),
    pagination: paginationMeta(page, pageSize, total),
  };
}

export async function getBlogPostBySlug(
  slug: string,
  opts: { lang?: 'ar' | 'en'; incrementViews?: boolean } = {},
): Promise<BlogPostDetail | null> {
  const { lang, incrementViews = true } = opts;
  const post = await prisma.blogPost.findUnique({
    where: { slug },
    include: POST_INCLUDE,
  });
  if (!post) {
    return null;
  }
  if (post.status !== 'PUBLISHED') {
    return null;
  }

  if (incrementViews) {
    await prisma.blogPost.update({
      where: { id: post.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  return toDetail(post, lang ?? 'en');
}

export async function listBlogCategories(): Promise<Array<{
  id: string;
  nameAr: string;
  nameEn: string;
  slug: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  postCount: number;
}>> {
  const categories = await prisma.blogCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { posts: { where: { status: 'PUBLISHED' } } } } },
  });
  return categories.map((c) => ({
    id: c.id,
    nameAr: c.nameAr,
    nameEn: c.nameEn,
    slug: c.slug,
    descriptionAr: c.descriptionAr,
    descriptionEn: c.descriptionEn,
    postCount: c._count.posts,
  }));
}

export async function listBlogTags(): Promise<Array<{ tag: string; count: number }>> {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'PUBLISHED' },
    select: { tags: true },
  });
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const tag of p.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

function toListItem(
  p: Prisma.BlogPostGetPayload<{ include: typeof POST_INCLUDE }>,
  _lang: 'ar' | 'en',
): BlogPostListItem {
  return {
    id: p.id,
    slug: p.slug,
    titleAr: p.titleAr,
    titleEn: p.titleEn,
    excerptAr: p.excerptAr,
    excerptEn: p.excerptEn,
    coverImageUrl: p.coverImageUrl,
    coverAltAr: p.coverAltAr,
    coverAltEn: p.coverAltEn,
    category: p.category
      ? {
          id: p.category.id,
          nameAr: p.category.nameAr,
          nameEn: p.category.nameEn,
          slug: p.category.slug,
        }
      : null,
    tags: p.tags,
    status: p.status,
    publishedAt: p.publishedAt,
    readingTimeMinutes: p.readingTimeMinutes,
    viewCount: p.viewCount,
    createdAt: p.createdAt.toISOString(),
  };
}

async function toDetail(
  p: Prisma.BlogPostGetPayload<{ include: typeof POST_INCLUDE }>,
  lang: 'ar' | 'en',
): Promise<BlogPostDetail> {
  return {
    ...toListItem(p, lang),
    contentAr: p.contentAr,
    contentEn: p.contentEn,
    contentHtmlAr: await markdownToHtml(p.contentAr),
    contentHtmlEn: await markdownToHtml(p.contentEn),
    seoTitleAr: p.seoTitleAr,
    seoTitleEn: p.seoTitleEn,
    seoDescriptionAr: p.seoDescriptionAr,
    seoDescriptionEn: p.seoDescriptionEn,
    author: p.author
      ? { id: p.author.id, name: p.author.name }
      : null,
    relatedProducts: p.products.map((pp) => {
      const prod = pp.product;
      return {
        id: prod.id,
        slug: prod.slug,
        sku: prod.sku,
        nameAr: prod.nameAr,
        nameEn: prod.nameEn,
        price: prod.price,
        stock: prod.stock,
        isActive: prod.isActive,
        primaryImage: prod.images[0]?.url ?? null,
      };
    }),
  };
}

export interface AdminPostInput {
  slug: string;
  titleAr: string;
  titleEn: string;
  excerptAr?: string | null;
  excerptEn?: string | null;
  contentAr: string;
  contentEn: string;
  coverImageUrl?: string | null;
  coverAltAr?: string | null;
  coverAltEn?: string | null;
  categoryId?: string | null;
  tags: string[];
  status: BlogPostStatus;
  publishedAt?: Date | null;
  readingTimeMinutes?: number;
  authorId?: string | null;
  seoTitleAr?: string | null;
  seoTitleEn?: string | null;
  seoDescriptionAr?: string | null;
  seoDescriptionEn?: string | null;
}

export async function createBlogPost(input: AdminPostInput, actorId: string) {
  const existing = await prisma.blogPost.findUnique({ where: { slug: input.slug } });
  if (existing) {
    throw AppError.conflict('Slug already exists', ErrorCodes.CONFLICT_SLUG);
  }
  const readingTimeMinutes =
    input.readingTimeMinutes ??
    readingTime(input.contentAr) + readingTime(input.contentEn);
  const post = await prisma.blogPost.create({
    data: {
      slug: input.slug,
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      excerptAr: input.excerptAr ?? null,
      excerptEn: input.excerptEn ?? null,
      contentAr: input.contentAr,
      contentEn: input.contentEn,
      coverImageUrl: input.coverImageUrl ?? null,
      coverAltAr: input.coverAltAr ?? null,
      coverAltEn: input.coverAltEn ?? null,
      categoryId: input.categoryId ?? null,
      tags: input.tags,
      status: input.status,
      publishedAt:
        input.status === 'PUBLISHED' ? (input.publishedAt ?? new Date()) : null,
      readingTimeMinutes,
      authorId: input.authorId ?? actorId,
      seoTitleAr: input.seoTitleAr ?? null,
      seoTitleEn: input.seoTitleEn ?? null,
      seoDescriptionAr: input.seoDescriptionAr ?? null,
      seoDescriptionEn: input.seoDescriptionEn ?? null,
    },
    include: { products: true },
  });
  return post;
}

export async function updateBlogPost(
  id: string,
  input: Partial<AdminPostInput>,
  _actorId: string,
) {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) {
    throw AppError.notFound('Post not found', ErrorCodes.NOT_FOUND);
  }
  if (input.slug && input.slug !== post.slug) {
    const existing = await prisma.blogPost.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw AppError.conflict('Slug already exists', ErrorCodes.CONFLICT_SLUG);
    }
  }
  let readingTimeMinutes = post.readingTimeMinutes;
  if (input.contentAr !== undefined || input.contentEn !== undefined) {
    readingTimeMinutes =
      input.readingTimeMinutes ??
      readingTime(input.contentAr ?? post.contentAr) +
        readingTime(input.contentEn ?? post.contentEn);
  }
  const updated = await prisma.blogPost.update({
    where: { id },
    data: {
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      ...(input.titleAr !== undefined ? { titleAr: input.titleAr } : {}),
      ...(input.titleEn !== undefined ? { titleEn: input.titleEn } : {}),
      ...(input.excerptAr !== undefined ? { excerptAr: input.excerptAr } : {}),
      ...(input.excerptEn !== undefined ? { excerptEn: input.excerptEn } : {}),
      ...(input.contentAr !== undefined ? { contentAr: input.contentAr } : {}),
      ...(input.contentEn !== undefined ? { contentEn: input.contentEn } : {}),
      ...(input.coverImageUrl !== undefined ? { coverImageUrl: input.coverImageUrl } : {}),
      ...(input.coverAltAr !== undefined ? { coverAltAr: input.coverAltAr } : {}),
      ...(input.coverAltEn !== undefined ? { coverAltEn: input.coverAltEn } : {}),
      ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
      ...(input.tags !== undefined ? { tags: input.tags } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.publishedAt !== undefined ? { publishedAt: input.publishedAt } : {}),
      ...(input.seoTitleAr !== undefined ? { seoTitleAr: input.seoTitleAr } : {}),
      ...(input.seoTitleEn !== undefined ? { seoTitleEn: input.seoTitleEn } : {}),
      ...(input.seoDescriptionAr !== undefined ? { seoDescriptionAr: input.seoDescriptionAr } : {}),
      ...(input.seoDescriptionEn !== undefined ? { seoDescriptionEn: input.seoDescriptionEn } : {}),
      readingTimeMinutes,
    },
    include: { products: true },
  });
  return updated;
}

export async function deleteBlogPost(id: string) {
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) {
    throw AppError.notFound('Post not found', ErrorCodes.NOT_FOUND);
  }
  await prisma.blogPost.delete({ where: { id } });
  return { deleted: true };
}

export async function listBlogPostsAdmin({
  page = 1,
  pageSize = 25,
  status,
  q,
}: { page?: number; pageSize?: number; status?: BlogPostStatus; q?: string }) {
  const where: Prisma.BlogPostWhereInput = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { titleAr: { contains: q, mode: 'insensitive' } },
      { titleEn: { contains: q, mode: 'insensitive' } },
    ];
  }
  const offset = (page - 1) * pageSize;
  const [total, posts] = await Promise.all([
    prisma.blogPost.count({ where }),
    prisma.blogPost.findMany({
      where,
      include: {
        category: { select: { id: true, nameAr: true, nameEn: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: pageSize,
    }),
  ]);
  return {
    posts: posts.map((p) => ({
      id: p.id,
      slug: p.slug,
      titleAr: p.titleAr,
      titleEn: p.titleEn,
      status: p.status,
      category: p.category,
      viewCount: p.viewCount,
      createdAt: p.createdAt.toISOString(),
    })),
    pagination: paginationMeta(page, pageSize, total),
  };
}

export async function publishScheduledPosts() {
  const now = new Date();
  const updated = await prisma.blogPost.updateMany({
    where: { status: 'SCHEDULED', publishedAt: { lte: now } },
    data: { status: 'PUBLISHED' },
  });
  return updated.count;
}
