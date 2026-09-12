/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument */
import { provisionSuperAdmin } from '../../scripts/create-super-admin';
import * as argon2 from 'argon2';
import { Role } from '@prisma/client';

describe('create-super-admin (provisioning logic)', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('valid provisioning requests creation with correct data and role', async () => {
    mockPrisma.user.create.mockResolvedValueOnce({
      email: 'admin@example.com',
    });

    const result = await provisionSuperAdmin(
      ' ADMIN@example.COM ',
      'password12345',
      'password12345',
      mockPrisma,
    );

    expect(result.email).toBe('admin@example.com');
    expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);

    const createArgs = mockPrisma.user.create.mock.calls[0][0].data;
    expect(createArgs.email).toBe('admin@example.com');
    expect(createArgs.role).toBe(Role.SUPER_ADMIN);
    expect(createArgs.isActive).toBe(true);
    expect(createArgs.passwordHash).toBeDefined();
    expect(createArgs.password).toBeUndefined();

    // Verify hash against password
    const verifyHash = await argon2.verify(
      createArgs.passwordHash,
      'password12345',
    );
    expect(verifyHash).toBe(true);
  });

  it('invalid email is rejected', async () => {
    await expect(
      provisionSuperAdmin(
        'not-an-email',
        'password12345',
        'password12345',
        mockPrisma,
      ),
    ).rejects.toThrow('Invalid email format.');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('password shorter than 12 characters is rejected', async () => {
    await expect(
      provisionSuperAdmin('admin@example.com', 'short', 'short', mockPrisma),
    ).rejects.toThrow('Password must be at least 12 characters long.');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('password confirmation mismatch is rejected', async () => {
    await expect(
      provisionSuperAdmin(
        'admin@example.com',
        'password12345',
        'password12345-wrong',
        mockPrisma,
      ),
    ).rejects.toThrow('Passwords do not match.');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('existing email is rejected', async () => {
    mockPrisma.user.findUnique.mockResolvedValueOnce({
      email: 'admin@example.com',
    });

    await expect(
      provisionSuperAdmin(
        'admin@example.com',
        'password12345',
        'password12345',
        mockPrisma,
      ),
    ).rejects.toThrow('Email admin@example.com is already in use.');
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('existing SUPER_ADMIN is rejected', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce({
      id: 'some-id',
      role: Role.SUPER_ADMIN,
    });

    await expect(
      provisionSuperAdmin(
        'admin2@example.com',
        'password12345',
        'password12345',
        mockPrisma,
      ),
    ).rejects.toThrow(
      'A SUPER_ADMIN already exists. Cannot bootstrap another.',
    );
    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });
});
