import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { ChannelType } from "@/generated/prisma/client";
import { db } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/current-user";
import { apiError } from "@/lib/server/http";
import {
  isWorkspaceAdminRole,
  requireWorkspaceMember,
} from "@/lib/server/access";

const inputSchema = z.object({
  workspaceId: z.string().min(1),
  userIds: z.array(z.string()).min(1).max(20),
});

const includeConversation = {
  channel: {
    include: {
      members: true,
      _count: {
        select: {
          members: true,
          messages: true,
        },
      },
    },
  },
  members: {
    include: {
      user: true,
    },
  },
} as const;

function safeUser(
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
  currentUserId: string,
  canSeeEmail: boolean,
) {
  return {
    ...user,
    email:
      canSeeEmail || user.id === currentUserId
        ? user.email
        : "",
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const workspaceId = request.nextUrl.searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 },
      );
    }

    const membership = await requireWorkspaceMember(workspaceId, user.id);
    const canSeeEmail = isWorkspaceAdminRole(membership.role);

    const conversations = await db.conversation.findMany({
      where: {
        workspaceId,
        members: {
          some: { userId: user.id },
        },
      },
      include: includeConversation,
      orderBy: { createdAt: "desc" },
    });

    const result = await Promise.all(
      conversations.map(async (conversation) => {
        const currentMembership = conversation.channel.members.find(
          (member) => member.userId === user.id,
        );

        const unreadCount = await db.message.count({
          where: {
            channelId: conversation.channelId,
            parentMessageId: null,
            createdAt: {
              gt: currentMembership?.lastReadAt ?? new Date(0),
            },
            authorId: {
              not: user.id,
            },
          },
        });

        const { members: _channelMembers, ...channel } = conversation.channel;
        return {
          ...conversation,
          members: conversation.members.map((member) => ({
            ...member,
            user: safeUser(member.user, user.id, canSeeEmail),
          })),
          channel: {
            ...channel,
            unreadCount,
            lastReadAt:
              currentMembership?.lastReadAt?.toISOString() ?? null,
            notificationsMuted:
              currentMembership?.notificationsMuted ?? false,
          },
        };
      }),
    );

    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const input = inputSchema.parse(await request.json());
    const membership = await requireWorkspaceMember(input.workspaceId, user.id);
    const canSeeEmail = isWorkspaceAdminRole(membership.role);

    const selectedIds = [
      ...new Set(input.userIds.filter((id) => id !== user.id)),
    ];

    if (!selectedIds.length) {
      return NextResponse.json(
        { error: "Choose another user" },
        { status: 400 },
      );
    }

    const others = await db.user.findMany({
      where: {
        id: { in: selectedIds },
        workspaceMemberships: {
          some: { workspaceId: input.workspaceId },
        },
      },
    });

    if (others.length !== selectedIds.length) {
      return NextResponse.json(
        { error: "Every selected person must belong to this workspace." },
        { status: 400 },
      );
    }

    if (selectedIds.length === 1) {
      const candidates = await db.conversation.findMany({
        where: {
          workspaceId: input.workspaceId,
          members: {
            some: { userId: user.id },
          },
        },
        include: includeConversation,
      });

      const existing = candidates.find(
        (item) =>
          item.members.length === 2 &&
          item.members.some((member) => member.userId === selectedIds[0]),
      );

      if (existing) {
        return NextResponse.json({
          ...existing,
          members: existing.members.map((member) => ({
            ...member,
            user: safeUser(member.user, user.id, canSeeEmail),
          })),
        });
      }
    }

    const memberIds = [user.id, ...selectedIds];
    const title = others.map((item) => item.name).join(", ");

    const conversation = await db.$transaction(async (tx) => {
      const channel = await tx.channel.create({
        data: {
          workspaceId: input.workspaceId,
          name: `dm-${crypto.randomUUID().slice(0, 8)}`,
          topic: title,
          type: ChannelType.DIRECT,
          isPrivate: true,
          createdById: user.id,
          members: {
            create: memberIds.map((userId) => ({ userId })),
          },
        },
      });

      return tx.conversation.create({
        data: {
          workspaceId: input.workspaceId,
          createdById: user.id,
          channelId: channel.id,
          title: selectedIds.length > 1 ? title : null,
          members: {
            create: memberIds.map((userId) => ({ userId })),
          },
        },
        include: includeConversation,
      });
    });

    return NextResponse.json(
      {
        ...conversation,
        members: conversation.members.map((member) => ({
          ...member,
          user: safeUser(member.user, user.id, canSeeEmail),
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}