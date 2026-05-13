import { prisma } from '../lib/prisma.js';

// ── Helpers ───────────────────────────────────────────────────────────────

function formatGroup(group) {
    const totalMembers = group.members?.length ?? 0;
    const saved = group.contributions
        ?.filter(c => c.status === 'COMPLETED')
        .reduce((sum, c) => sum + Number(c.amount), 0) ?? Number(group.saved);

    return {
        id: group.id,
        name: group.name,
        description: group.description,
        target: Number(group.target),
        saved,
        type: group.type?.toLowerCase() ?? 'chama',
        color: group.color ?? '#1a3a8f',
        status: group.status?.toLowerCase() ?? 'active',
        frequency: group.frequency,
        contributionAmount: group.contributionAmount ? Number(group.contributionAmount) : null,
        totalMembers,
        members: (group.members ?? []).map(m => ({
            id: m.user.id,
            name: m.user.name,
            avatar: m.user.avatarUrl,
            role: m.role,
            joinedAt: m.joinedAt,
        })),
        treasurer: group.treasurerName
            ? { name: group.treasurerName, phone: group.treasurerPhone, method: 'M-Pesa' }
            : null,
        createdAt: group.createdAt,
    };
}

// ── GET /family/groups ────────────────────────────────────────────────────

export async function listGroups(req, res, next) {
    try {
        const { tenantId } = req.user;
        if (!tenantId) return res.status(403).json({ error: 'Not part of a family' });

        const groups = await prisma.group.findMany({
            where: { tenantId },
            include: {
                members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
                contributions: { where: { status: 'COMPLETED' }, select: { amount: true, status: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        res.json(groups.map(formatGroup));
    } catch (err) {
        next(err);
    }
}

// ── POST /family/groups ───────────────────────────────────────────────────

export async function createGroup(req, res, next) {
    try {
        const { tenantId, id: userId } = req.user;
        if (!tenantId) return res.status(403).json({ error: 'Not part of a family' });

        const { name, description, target, type, color, frequency, contributionAmount, treasurerName, treasurerPhone } = req.body;

        if (!name) return res.status(400).json({ error: 'Group name is required' });

        const group = await prisma.group.create({
            data: {
                tenantId,
                name,
                description: description ?? null,
                target: parseFloat(target) || 0,
                type: (type ?? 'CHAMA').toUpperCase(),
                color: color ?? '#1a3a8f',
                frequency: frequency ?? null,
                contributionAmount: contributionAmount ? parseFloat(contributionAmount) : null,
                treasurerName: treasurerName ?? null,
                treasurerPhone: treasurerPhone ?? null,
                // Auto-add creator as ADMIN member
                members: { create: { userId, role: 'ADMIN' } },
            },
            include: {
                members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
                contributions: true,
            },
        });

        res.status(201).json(formatGroup(group));
    } catch (err) {
        next(err);
    }
}

// ── GET /family/groups/:id ────────────────────────────────────────────────

export async function getGroup(req, res, next) {
    try {
        const { tenantId } = req.user;
        const groupId = parseInt(req.params.id);

        if (!tenantId) return res.status(403).json({ error: 'Not part of a family' });
        if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid group id' });

        const group = await prisma.group.findFirst({
            where: { id: groupId, tenantId },
            include: {
                members: { include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true, role: true } } } },
                contributions: { orderBy: { createdAt: 'desc' }, take: 50, include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
            },
        });

        if (!group) return res.status(404).json({ error: 'Group not found' });

        res.json({
            ...formatGroup(group),
            recentContributions: group.contributions.map(c => ({
                id: c.id,
                memberId: c.userId,
                memberName: c.user?.name ?? 'Unknown',
                memberAvatar: c.user?.avatarUrl ?? null,
                amount: Number(c.amount),
                method: c.method,
                status: c.status.toLowerCase(),
                note: c.note,
                date: c.createdAt,
            })),
        });
    } catch (err) {
        next(err);
    }
}

// ── POST /family/groups/:id/contribute ────────────────────────────────────

export async function contribute(req, res, next) {
    try {
        const { tenantId, id: userId } = req.user;
        const groupId = parseInt(req.params.id);

        if (!tenantId) return res.status(403).json({ error: 'Not part of a family' });
        if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid group id' });

        const { amount, method, note } = req.body;
        if (!amount || isNaN(parseFloat(amount))) return res.status(400).json({ error: 'Valid amount is required' });

        // Check group belongs to tenant
        const group = await prisma.group.findFirst({ where: { id: groupId, tenantId } });
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // Create contribution and update saved amount in one transaction
        const [contribution] = await prisma.$transaction([
            prisma.groupContribution.create({
                data: {
                    groupId,
                    userId,
                    amount: parseFloat(amount),
                    method: method ?? 'M-PESA',
                    status: 'COMPLETED',
                    note: note ?? null,
                },
                include: { user: { select: { id: true, name: true, avatarUrl: true } } },
            }),
            prisma.group.update({
                where: { id: groupId },
                data: { saved: { increment: parseFloat(amount) } },
            }),
        ]);

        res.status(201).json({
            id: contribution.id,
            groupId,
            memberId: contribution.userId,
            memberName: contribution.user?.name,
            amount: Number(contribution.amount),
            method: contribution.method,
            status: contribution.status.toLowerCase(),
            note: contribution.note,
            date: contribution.createdAt,
        });
    } catch (err) {
        next(err);
    }
}

// ── GET /family/groups/:id/activity ──────────────────────────────────────

export async function getActivity(req, res, next) {
    try {
        const { tenantId } = req.user;
        const groupId = parseInt(req.params.id);

        if (!tenantId) return res.status(403).json({ error: 'Not part of a family' });
        if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid group id' });

        const group = await prisma.group.findFirst({ where: { id: groupId, tenantId } });
        if (!group) return res.status(404).json({ error: 'Group not found' });

        const contributions = await prisma.groupContribution.findMany({
            where: { groupId },
            orderBy: { createdAt: 'desc' },
            take: 100,
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        });

        res.json(contributions.map(c => ({
            id: c.id,
            memberId: c.userId,
            memberName: c.user?.name ?? 'Unknown',
            memberAvatar: c.user?.avatarUrl ?? null,
            amount: Number(c.amount),
            method: c.method,
            status: c.status.toLowerCase(),
            note: c.note,
            date: c.createdAt,
        })));
    } catch (err) {
        next(err);
    }
}

// ── POST /family/groups/:id/members ──────────────────────────────────────

export async function addGroupMember(req, res, next) {
    try {
        const { tenantId } = req.user;
        const groupId = parseInt(req.params.id);

        if (!tenantId) return res.status(403).json({ error: 'Not part of a family' });
        if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid group id' });

        const { userId, role } = req.body;
        if (!userId) return res.status(400).json({ error: 'userId is required' });

        // Ensure both group and target user belong to same tenant
        const [group, user] = await Promise.all([
            prisma.group.findFirst({ where: { id: groupId, tenantId } }),
            prisma.user.findFirst({ where: { id: parseInt(userId), tenantId } }),
        ]);

        if (!group) return res.status(404).json({ error: 'Group not found' });
        if (!user) return res.status(404).json({ error: 'User not found in this family' });

        const member = await prisma.groupMember.upsert({
            where: { groupId_userId: { groupId, userId: parseInt(userId) } },
            create: { groupId, userId: parseInt(userId), role: (role ?? 'MEMBER').toUpperCase() },
            update: { role: (role ?? 'MEMBER').toUpperCase() },
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        });

        res.status(201).json({
            id: member.user.id,
            name: member.user.name,
            avatar: member.user.avatarUrl,
            role: member.role,
            joinedAt: member.joinedAt,
        });
    } catch (err) {
        next(err);
    }
}

// ── DELETE /family/groups/:id/members/:memberId ───────────────────────────

export async function removeGroupMember(req, res, next) {
    try {
        const { tenantId } = req.user;
        const groupId = parseInt(req.params.id);
        const memberId = parseInt(req.params.memberId);

        if (!tenantId) return res.status(403).json({ error: 'Not part of a family' });

        const group = await prisma.group.findFirst({ where: { id: groupId, tenantId } });
        if (!group) return res.status(404).json({ error: 'Group not found' });

        await prisma.groupMember.deleteMany({ where: { groupId, userId: memberId } });

        res.json({ message: 'Member removed from group' });
    } catch (err) {
        next(err);
    }
}

// ── PUT /family/groups/:id ────────────────────────────────────────────────

export async function updateGroup(req, res, next) {
    try {
        const { tenantId } = req.user;
        const groupId = parseInt(req.params.id);

        if (!tenantId) return res.status(403).json({ error: 'Not part of a family' });
        if (isNaN(groupId)) return res.status(400).json({ error: 'Invalid group id' });

        const { name, description, target, color, frequency, contributionAmount, status, treasurerName, treasurerPhone } = req.body;

        const group = await prisma.group.findFirst({ where: { id: groupId, tenantId } });
        if (!group) return res.status(404).json({ error: 'Group not found' });

        const updated = await prisma.group.update({
            where: { id: groupId },
            data: {
                ...(name && { name }),
                ...(description !== undefined && { description }),
                ...(target !== undefined && { target: parseFloat(target) }),
                ...(color && { color }),
                ...(frequency !== undefined && { frequency }),
                ...(contributionAmount !== undefined && { contributionAmount: contributionAmount ? parseFloat(contributionAmount) : null }),
                ...(status && { status: status.toUpperCase() }),
                ...(treasurerName !== undefined && { treasurerName }),
                ...(treasurerPhone !== undefined && { treasurerPhone }),
            },
            include: {
                members: { include: { user: { select: { id: true, name: true, avatarUrl: true } } } },
                contributions: { where: { status: 'COMPLETED' }, select: { amount: true, status: true } },
            },
        });

        res.json(formatGroup(updated));
    } catch (err) {
        next(err);
    }
}

// ── DELETE /family/groups/:id ─────────────────────────────────────────────

export async function deleteGroup(req, res, next) {
    try {
        const { tenantId } = req.user;
        const groupId = parseInt(req.params.id);

        if (!tenantId) return res.status(403).json({ error: 'Not part of a family' });

        const group = await prisma.group.findFirst({ where: { id: groupId, tenantId } });
        if (!group) return res.status(404).json({ error: 'Group not found' });

        await prisma.group.delete({ where: { id: groupId } });

        res.json({ message: 'Group deleted' });
    } catch (err) {
        next(err);
    }
}
