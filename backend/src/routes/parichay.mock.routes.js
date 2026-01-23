/**
 * @fileoverview Mock Parichay Routes - Returns dummy responses for local testing
 */
import { Router } from 'express';
import { User } from '../models/user.model.js';

const router = Router();

// GET /auth-url - return dummy authorization URL and PKCE params
router.get('/auth-url', (req, res) => {
  const codeVerifier = 'MOCK_CODE_VERIFIER_abcdef123456';
  const state = 'MOCK_STATE_abcdef123456';
  const authorizationUrl = `${process.env.PARICHAY_URL || 'https://parichay.nic.in'}/pnv1/oauth2/authorize?mock=true`;

  return res.status(200).json({
    success: true,
    data: {
      authorizationUrl,
      codeVerifier,
      state
    },
    message: 'Authorization URL (mock) generated successfully'
  });
});

// POST /callback - return a mocked user and token. If `mockEmail` or `mockLab` provided
// and a matching user exists in the DB, return that user (useful when you've seeded test users).
router.post('/callback', async (req, res) => {
  const { mockEmail, mockLab } = req.body || {};

  // Try to find a seeded user if email or lab provided
  if (mockEmail || mockLab) {
    try {
      let found = null;
      if (mockEmail) {
        found = await User.findOne({ email: mockEmail }).select('-password -refreshToken -parichayAccessToken -parichayRefreshToken');
      } else if (mockLab) {
        found = await User.findOne({ labName: mockLab }).select('-password -refreshToken -parichayAccessToken -parichayRefreshToken');
      }

      if (found) {
        return res.status(200).json({
          success: true,
          data: {
            user: found,
            accessToken: 'MOCK_ACCESS_TOKEN_abc123'
          },
          message: 'Parichay login successful (mock - seeded user)'
        });
      }
    } catch (err) {
      console.warn('Mock callback DB lookup failed:', err.message);
      // fallthrough to default mocked response
    }
  }

  // Default mock user
  const mockedUser = {
    _id: 'mock-user-1',
    fullName: 'Mock User',
    email: 'mock.user@csir.res.in',
    status: 'Approved',
    role: 'User'
  };

  const accessToken = 'MOCK_ACCESS_TOKEN_abc123';

  return res.status(200).json({
    success: true,
    data: {
      user: mockedUser,
      accessToken
    },
    message: 'Parichay login successful (mock)'
  });
});

export default router;
