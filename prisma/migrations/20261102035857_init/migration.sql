-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    `image` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `phone` VARCHAR(191) NULL,
    `isAdmin` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Session` (
    `id` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `token` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `ipAddress` VARCHAR(191) NULL,
    `userAgent` TEXT NULL,
    `userId` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `Session_token_key`(`token`),
    INDEX `Session_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Account` (
    `id` VARCHAR(191) NOT NULL,
    `accountId` VARCHAR(191) NOT NULL,
    `providerId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `accessToken` TEXT NULL,
    `refreshToken` TEXT NULL,
    `idToken` TEXT NULL,
    `accessTokenExpiresAt` DATETIME(3) NULL,
    `refreshTokenExpiresAt` DATETIME(3) NULL,
    `scope` TEXT NULL,
    `password` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Account_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Verification` (
    `id` VARCHAR(191) NOT NULL,
    `identifier` VARCHAR(191) NOT NULL,
    `value` TEXT NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Verification_identifier_idx`(`identifier`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Barber` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `displayName` VARCHAR(191) NOT NULL,
    `bio` TEXT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Barber_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Service` (
    `id` VARCHAR(191) NOT NULL,
    `barberId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `blocks` INTEGER NOT NULL DEFAULT 1,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Service_barberId_idx`(`barberId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkPeriod` (
    `id` VARCHAR(191) NOT NULL,
    `barberId` VARCHAR(191) NOT NULL,
    `weekday` INTEGER NOT NULL,
    `startMinutes` INTEGER NOT NULL,
    `endMinutes` INTEGER NOT NULL,

    INDEX `WorkPeriod_barberId_weekday_idx`(`barberId`, `weekday`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeOff` (
    `id` VARCHAR(191) NOT NULL,
    `barberId` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `endsAt` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TimeOff_barberId_startsAt_idx`(`barberId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Booking` (
    `id` VARCHAR(191) NOT NULL,
    `barberId` VARCHAR(191) NOT NULL,
    `clientId` VARCHAR(191) NULL,
    `clientName` VARCHAR(191) NOT NULL,
    `clientPhone` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,
    `blocks` INTEGER NOT NULL,
    `price` INTEGER NOT NULL,
    `deposit` INTEGER NOT NULL,
    `status` ENUM('PENDING_DEPOSIT', 'CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'EXPIRED') NOT NULL,
    `depositStatus` ENUM('PENDING', 'PAID', 'NOT_REQUIRED', 'REFUND_DUE', 'REFUNDED', 'RETAINED') NOT NULL,
    `paymentMethod` ENUM('MERCADO_PAGO', 'CASH') NULL,
    `paymentDeadline` DATETIME(3) NULL,
    `source` ENUM('ONLINE', 'MANUAL') NOT NULL,
    `cancelledBy` ENUM('CLIENT', 'STAFF') NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Booking_barberId_startsAt_idx`(`barberId`, `startsAt`),
    INDEX `Booking_clientId_status_idx`(`clientId`, `status`),
    INDEX `Booking_status_paymentDeadline_idx`(`status`, `paymentDeadline`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingItem` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `serviceId` VARCHAR(191) NULL,
    `name` VARCHAR(191) NOT NULL,
    `price` INTEGER NOT NULL,
    `blocks` INTEGER NOT NULL,

    INDEX `BookingItem_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BookingSlot` (
    `id` VARCHAR(191) NOT NULL,
    `barberId` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `startsAt` DATETIME(3) NOT NULL,

    INDEX `BookingSlot_bookingId_idx`(`bookingId`),
    UNIQUE INDEX `BookingSlot_barberId_startsAt_key`(`barberId`, `startsAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Payment` (
    `id` VARCHAR(191) NOT NULL,
    `bookingId` VARCHAR(191) NOT NULL,
    `providerPaymentId` VARCHAR(191) NOT NULL,
    `amount` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Payment_providerPaymentId_key`(`providerPaymentId`),
    INDEX `Payment_bookingId_idx`(`bookingId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Session` ADD CONSTRAINT `Session_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Account` ADD CONSTRAINT `Account_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Barber` ADD CONSTRAINT `Barber_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Service` ADD CONSTRAINT `Service_barberId_fkey` FOREIGN KEY (`barberId`) REFERENCES `Barber`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkPeriod` ADD CONSTRAINT `WorkPeriod_barberId_fkey` FOREIGN KEY (`barberId`) REFERENCES `Barber`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TimeOff` ADD CONSTRAINT `TimeOff_barberId_fkey` FOREIGN KEY (`barberId`) REFERENCES `Barber`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_barberId_fkey` FOREIGN KEY (`barberId`) REFERENCES `Barber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Booking` ADD CONSTRAINT `Booking_clientId_fkey` FOREIGN KEY (`clientId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingItem` ADD CONSTRAINT `BookingItem_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingItem` ADD CONSTRAINT `BookingItem_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `Service`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingSlot` ADD CONSTRAINT `BookingSlot_barberId_fkey` FOREIGN KEY (`barberId`) REFERENCES `Barber`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BookingSlot` ADD CONSTRAINT `BookingSlot_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Payment` ADD CONSTRAINT `Payment_bookingId_fkey` FOREIGN KEY (`bookingId`) REFERENCES `Booking`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
