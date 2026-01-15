const { PrismaClient } = require('../../generated/prisma');
const prisma = new PrismaClient();

const STATUS_ACTIVE = 1; // Adjust based on status codes

/**
 * List all conversations for a user.
 */
exports.listConversations = async (userId) => {
  const conversations = await prisma.conversation.findMany({
    where: { userId: BigInt(userId), statusId: STATUS_ACTIVE },
    orderBy: { modifiedAt: 'desc' },
    select: {
      conversationId: true,
      title: true,
      createdAt: true,
      modifiedAt: true,
    },
  });

  return conversations;
};

/**
 * Create a new conversation.
 */
exports.createConversation = async (userId, title) => {
  try {
    title = title && title.length > 100 ? title.slice(0, 100) : title;
    const conversation = await prisma.conversation.create({
      data: {
        userId: BigInt(userId),
        title: title || 'New Conversation',
        statusId: STATUS_ACTIVE,
      },
      select: {
        conversationId: true,
        title: true,
        createdAt: true,
        modifiedAt: true,
      },
    });

    return conversation;
  } catch (error) {
    console.error('Error creating conversation:', error);
    throw error;
  }
};

/**
 * Get a conversation and its messages.
 */
exports.getConversation = async (userId, conversationId) => {
  const conversation = await prisma.conversation.findFirst({
    where: { conversationId, userId: BigInt(userId), statusId: STATUS_ACTIVE },
    include: {
      messages: {
        where: { statusId: STATUS_ACTIVE },
        orderBy: { createdAt: 'asc' },
        select: {
          messageId: true,
          senderType: { select: { senderType: true } },
          content: true,
          createdAt: true,
        },
      },
    },
  });

  if (!conversation) return null;

  return {
    ...conversation,
    messages: conversation.messages.map((m) => ({
      ...m,
      senderType: m.senderType.senderType,
    })),
  };
};

/**
 * List paginated messages for a conversation.
 */
exports.listMessages = async (
  userId,
  conversationId,
  page = 1,
  pageSize = 20,
) => {
  const skip = (page - 1) * pageSize;
  const messages = await prisma.message.findMany({
    where: {
      conversationId,
      conversation: { userId: BigInt(userId), statusId: STATUS_ACTIVE },
      statusId: STATUS_ACTIVE,
    },
    orderBy: { createdAt: 'asc' },
    skip,
    take: pageSize,
    select: {
      messageId: true,
      senderType: {
        select: {
          senderType: true,
        },
      },
      content: true,
      createdAt: true,
    },
  });

  const conversation = await prisma.conversation.findUnique({
    where: { conversationId },
  });

  return {
    messages: messages.map((m) => ({
      ...m,
      senderType: m.senderType.senderType,
    })),
    conversation,
  };
};

/**
 * Create a message in a conversation.
 */
exports.createMessage = async (conversationId, senderTypeId, content) => {
  const message = await prisma.message.create({
    data: {
      conversationId,
      senderTypeId,
      content,
      statusId: STATUS_ACTIVE,
    },
  });

  return message;
};

/**
 * Soft delete a conversation and its messages.
 */
exports.deleteConversation = async (userId, conversationId) => {
  try {
    const STATUS_DELETED = 2; // Adjust based on your status codes
    // Soft delete conversation
    const updated = await prisma.conversation.updateMany({
      where: { conversationId, userId: BigInt(userId), statusId: STATUS_ACTIVE },
      data: { statusId: STATUS_DELETED },
    });
    // Soft delete messages
    await prisma.message.updateMany({
      where: { conversationId, statusId: STATUS_ACTIVE },
      data: { statusId: STATUS_DELETED },
    });
    return updated.count > 0;
  } catch (error) {
    console.error('Error deleting conversation:', error);
    throw error;
  }
};

/**
 * Get all conversations with pagination and search.
 */
exports.getAllConversations = async ({
  page,
  pageSize,
  sortBy,
  order,
  search,
  filter,
  userId,
}) => {
  try {
    let where = {
      ...filter,
      userId: BigInt(userId),
      statusId: STATUS_ACTIVE,
    };

    if (search && search.trim() !== '') {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { conversationId: { contains: search, mode: 'insensitive' } },
      ];
    }

    const conversationCount = await prisma.conversation.count({ where });

    const conversationList = await prisma.conversation.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        conversationId: true,
        title: true,
        createdAt: true,
        modifiedAt: true,
      },
    });

    return {
      pageCount: Math.ceil(conversationCount / pageSize),
      conversationList,
    };
  } catch (error) {
    console.error('Error getting conversations:', error);
    throw error;
  }
};
