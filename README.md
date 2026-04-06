# Event Ticket Booking System — DBMS Project

This project is a full-stack web application designed primarily to demonstrate advanced Database Management System (DBMS) concepts. While it features a complete React frontend and a Node.js API backend, the architectural focus is strictly centered around relational database design, ACID compliance, concurrency control, and polyglot persistence.

---

## 1. Architecture & Tools Used

### Core Tools
- **Relational Database (Primary):** MySQL 8.0 (handles strict transactional data like users, events, and bookings).
- **NoSQL Database (Secondary):** MongoDB (handles unstructured user feedback telemetry natively without disrupting the strict SQL schema).
- **Backend:** Node.js with Express.
- **Database Driver:** `mysql2/promise` (utilized for efficient connection pooling and manual transaction management) and Mongoose for MongoDB.
- **Frontend:** React (Vite) utilizing Axios for data mutation.

### Database Interaction Architecture
The backend does not rely on hefty ORMs (like Sequelize) for the MySQL implementation in order to have raw, fine-grained control over the SQL executions. It relies on a **Connection Pool** to manage concurrent database connections optimally. For state mutations involving money and seat availability, we explicitly acquire exclusive `getConnection()` locks to execute multi-step routines within single database-level transactions context (`BEGIN`, `COMMIT`, `ROLLBACK`).

---

## 2. Functional Dependencies & Normalization

The primary MySQL database (`event_booking`) is modeled carefully to adhere to standard normalization rules, ensuring minimal data anomaly and zero redundancy. 

### Database Normalization
- **1NF (First Normal Form):** All tables have a designated Primary Key (e.g., `UserID`, `EventID`). All fields contain atomic, indivisible values. For example, `FirstName` and `LastName` are split rather than grouped into a single `FullName` column.
- **2NF (Second Normal Form):** All non-key attributes are strictly dependent on the primary key. In our composite tables (like `booking_item` and `user_phone`), there are no partial dependencies natively present.
- **3NF & BCNF (Third Normal Form & Boyce-Codd):** There are no transitive dependencies. For instance, the `event` table stores `VenueID` (Foreign Key) rather than eagerly duplicating the `VenueName` or `VenueAddress` in the event row. If the venue address changes, only the `venue` tuple needs to be updated.

### Key Functional Dependencies (FDs)
Functional dependencies define the strict relationships mapped within the database tables:
- **`user` table:**
  `UserID` → { `FirstName`, `LastName`, `Email` }
  `Email` → { `UserID` } *(Candidate Key)*
- **`venue` table:**
  `VenueID` → { `Name`, `Street`, `City`, `State`, `Capacity` }
- **`event` table:**
  `EventID` → { `OrganizerID`, `VenueID`, `Title`, `EventDateTime`, `EventStatus` }
  { `VenueID`, `EventDateTime` } → { `EventID` } *(Strict constraint to prevent physical double-bookings)*
- **`ticket` table:**
  `TicketID` → { `EventID`, `SeatNumber`, `BasePrice`, `Category` }
  { `EventID`, `SeatNumber` } → { `TicketID` } *(Seat uniqueness per event)*

---

## 3. SQL Operations (DML & Aggregations)

To power the dashboard and API requests, the system utilizes complex SQL operations far beyond primitive CRUD inserts:

### Aggregate Functions & GROUP BY
To display metrics to the organizers dynamically without duplicating counting efforts, we utilize `COUNT` operations. 
*Example: Calculating total and sold ticket capacities in the Organizer Dashboard:*
```sql
SELECT e.EventID, e.Title,
       COUNT(DISTINCT t.TicketID) AS TotalTickets,
       COUNT(DISTINCT bi.TicketID) AS BookedTickets
FROM event e
LEFT JOIN ticket t ON e.EventID = t.EventID
LEFT JOIN booking_item bi ON t.TicketID = bi.TicketID
WHERE e.OrganizerID = ?
GROUP BY e.EventID
```

### JOIN Operations
The database utilizes multiple variants of JOINS to aggregate normalized data across multiple tables. 
- **`INNER JOIN`:** Pulls strict relationships, such as matching `event` entries to their respective `venue` parent records.
- **`LEFT JOIN`:** Used extensively in the ticketing logic (as seen above) to ensure an event is still returned to the dashboard even if it hasn't generated any tickets `t` or generated bookings `bi` yet.

### Advanced Triggers 
We offload domain logic directly to the database layer to ensure data integrity during mutations. 
- **`after_payment_insert` Trigger:** Whenever a new `payment` tuple achieves the required status, the MySQL Engine natively intercepts the INSERT to execute an internal child query: `UPDATE booking SET Status = 'Confirmed' WHERE BookingID = NEW.BookingID;`. This keeps the API codebase slim and ensures the data remains perfectly synchronized. 

---

## 4. Concurrency Control, ACID & High Availability

In a live ticketing environment, race conditions are catastrophic (e.g., two users successfully finalizing payment for the exact same seat at the exact same millisecond). 

1. **Atomicity & Consistency (Transactions):** 
   When a user commits to buying a ticket, the creation of a `booking` and its associative `booking_item`s run in an atomic block. If an error occurs midway, `await conn.rollback();` reverses all partial writes.
2. **Isolation Level & Row-Level Locking:**
   Inside the booking SQL transaction, we execute an explicit **`SELECT ... FOR UPDATE`**. Before the booking writes to the `booking_item` table, the Database engine grabs an exclusive write lock on the `ticket` row. If a concurrent transaction tries to book the same ticket, the MySQL engine forces it to wait or fails to acquire the lock gracefully with zero chance of overlap.
3. **Polyglot Setup:**
   The strictness of MySQL is perfect for financial ticketing. However, user-submitted Application Feedback (which varies in schema, metadata, and length) is dumped entirely into a Mongo Database cluster, preventing the primary relationship-driven Engine from bloating with log data.

---

## 5. Result and Conclusion

This project successfully constructs a highly reliable database infrastructure capable of handling high-stakes event interactions. 

By applying rigid Functional Dependencies and Normalization up to the 3rd Normal Form (3NF), data anomalies are completely eradicated. Furthermore, moving beyond simple DB design, the deployment of robust SQL queries (Aggregates, Left Joins), DB-level Triggers, and programmatic `FOR UPDATE` transaction locks effectively neutralize common enterprise risks such as Venue Conflicts and Seat double-bookings. The incorporation of a secondary NoSQL datastore further underscores the adaptability of modern database paradigms.
