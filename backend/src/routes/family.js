import { Router } from 'express';
import { verifyJWT } from '../middleware/auth.js';
import { getFamily, updateFamily, createMember, createGoal, getGoals, createBudgets, getBudgets } from '../controllers/familyController.js';
import {
    getFamilySettings,
    updateMemberPermissions,
    updateMemberRole,
    removeMember,
    leaveFamily,
    deleteFamily,
    getMemberDetails,
    getDashboardStats,
    updateFamilyProfile
} from '../controllers/familySettingsController.js';
import {
    listGroups,
    createGroup,
    getGroup,
    contribute,
    getActivity,
    addGroupMember,
    removeGroupMember,
    updateGroup,
    deleteGroup,
} from '../controllers/familyGroupController.js';
import { upload } from '../middleware/upload.js';

const router = Router();

// All routes require authentication
router.use(verifyJWT);

// Family basic operations
router.get('/', getFamily);
router.put('/', updateFamily);
router.post('/members', upload.single('profileImage'), createMember);

// Goals
router.post('/goals', createGoal);
router.get('/goals', getGoals);

// Budgets
router.post('/budgets', createBudgets);
router.get('/budgets', getBudgets);

// Family Settings
router.get('/settings', getFamilySettings);
router.get('/dashboard', getDashboardStats);
router.put('/profile', upload.single('avatar'), updateFamilyProfile);

// Member Management
router.get('/members/:memberId', getMemberDetails);
router.put('/members/:memberId/permissions', updateMemberPermissions);
router.put('/members/:memberId/role', updateMemberRole);
router.delete('/members/:memberId', removeMember);

// Family Actions
router.delete('/leave', leaveFamily);
router.delete('/', deleteFamily);

// ── Family Groups / Chama ────────────────────────────────────────────────
router.get('/groups',                           listGroups);
router.post('/groups',                          createGroup);
router.get('/groups/:id',                       getGroup);
router.put('/groups/:id',                       updateGroup);
router.delete('/groups/:id',                    deleteGroup);
router.post('/groups/:id/contribute',           contribute);
router.get('/groups/:id/activity',              getActivity);
router.post('/groups/:id/members',              addGroupMember);
router.delete('/groups/:id/members/:memberId',  removeGroupMember);

export default router;
