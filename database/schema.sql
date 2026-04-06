-- ============================================================
-- Event Ticket Booking System – Database Schema
-- Database: event_booking  (tables already created)
-- This file is kept as reference / re-run script.
-- ============================================================

CREATE DATABASE IF NOT EXISTS event_booking;
USE event_booking;

CREATE TABLE IF NOT EXISTS user (
    UserID      INT AUTO_INCREMENT PRIMARY KEY,
    FirstName   VARCHAR(50)  NOT NULL,
    LastName    VARCHAR(50)  NOT NULL,
    Email       VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS user_credentials (
    UserID       INT          NOT NULL PRIMARY KEY,
    PasswordHash VARCHAR(255) NOT NULL,
    Salt         VARCHAR(255) NOT NULL,
    FOREIGN KEY (UserID) REFERENCES user(UserID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_phone (
    UserID      INT         NOT NULL,
    PhoneNumber VARCHAR(20) NOT NULL,
    PRIMARY KEY (UserID, PhoneNumber),
    FOREIGN KEY (UserID) REFERENCES user(UserID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customer (
    UserID     INT  NOT NULL PRIMARY KEY,
    DateJoined DATE NOT NULL,
    FOREIGN KEY (UserID) REFERENCES user(UserID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organizer (
    UserID           INT          NOT NULL PRIMARY KEY,
    OrganizationName VARCHAR(100) NOT NULL,
    VerifiedStatus   TINYINT(1)   NOT NULL DEFAULT 0,
    FOREIGN KEY (UserID) REFERENCES user(UserID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS venue (
    VenueID  INT AUTO_INCREMENT PRIMARY KEY,
    Name     VARCHAR(100) NOT NULL,
    Street   VARCHAR(100),
    City     VARCHAR(50),
    State    VARCHAR(50),
    ZipCode  VARCHAR(10),
    Capacity INT
);

CREATE TABLE IF NOT EXISTS event (
    EventID       INT AUTO_INCREMENT PRIMARY KEY,
    OrganizerID   INT          NOT NULL,
    VenueID       INT          NOT NULL,
    Title         VARCHAR(200) NOT NULL,
    EventDateTime DATETIME     NOT NULL,
    EventStatus   VARCHAR(20)  NOT NULL DEFAULT 'Active',
    UNIQUE KEY uq_venue_datetime (VenueID, EventDateTime),
    FOREIGN KEY (OrganizerID) REFERENCES organizer(UserID),
    FOREIGN KEY (VenueID)     REFERENCES venue(VenueID)
);

CREATE TABLE IF NOT EXISTS ticket (
    TicketID   INT AUTO_INCREMENT PRIMARY KEY,
    EventID    INT            NOT NULL,
    SeatNumber VARCHAR(10)    NOT NULL,
    BasePrice  DECIMAL(10,2)  NOT NULL,
    Category   VARCHAR(50),
    UNIQUE KEY uq_event_seat (EventID, SeatNumber),
    FOREIGN KEY (EventID) REFERENCES event(EventID) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS booking (
    BookingID   INT AUTO_INCREMENT PRIMARY KEY,
    CustomerID  INT         NOT NULL,
    BookingDate DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    Status      VARCHAR(20) NOT NULL DEFAULT 'Pending',
    FOREIGN KEY (CustomerID) REFERENCES customer(UserID)
);

CREATE TABLE IF NOT EXISTS booking_item (
    BookingID INT           NOT NULL,
    TicketID  INT           NOT NULL,
    SoldPrice DECIMAL(10,2) NOT NULL,
    PRIMARY KEY (BookingID, TicketID),
    FOREIGN KEY (BookingID) REFERENCES booking(BookingID) ON DELETE CASCADE,
    FOREIGN KEY (TicketID)  REFERENCES ticket(TicketID)
);

CREATE TABLE IF NOT EXISTS payment (
    PaymentID     INT AUTO_INCREMENT PRIMARY KEY,
    BookingID     INT           NOT NULL,
    PaymentMethod VARCHAR(50)   NOT NULL,
    AmountPaid    DECIMAL(10,2) NOT NULL,
    PaymentStatus VARCHAR(20)   NOT NULL DEFAULT 'Pending',
    Timestamp     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (BookingID) REFERENCES booking(BookingID)
);

-- ============================================================
-- Triggers
-- ============================================================

DELIMITER //

CREATE TRIGGER IF NOT EXISTS after_payment_insert
AFTER INSERT ON payment
FOR EACH ROW
BEGIN
    -- Automatically set the parent booking to Confirmed when the payment is completed
    IF NEW.PaymentStatus = 'Completed' THEN
        UPDATE booking SET Status = 'Confirmed' WHERE BookingID = NEW.BookingID;
    END IF;
END; //

DELIMITER ;
