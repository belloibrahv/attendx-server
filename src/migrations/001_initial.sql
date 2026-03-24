-- Initial schema for AttendX
-- Run: psql -d attendx -f migrations/001_initial.sql

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    role VARCHAR(20) NOT NULL CHECK (role IN ('student', 'lecturer', 'kiosk')),
    identifier VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(role, identifier)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(50) PRIMARY KEY,
    course_code VARCHAR(20) NOT NULL,
    course_title VARCHAR(255) NOT NULL,
    room VARCHAR(100) NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20) NOT NULL,
    expected_count INTEGER DEFAULT 0,
    face_required BOOLEAN DEFAULT false,
    qr_rotation_seconds INTEGER DEFAULT 10,
    status VARCHAR(20) DEFAULT 'live' CHECK (status IN ('live', 'ended')),
    checked_in INTEGER DEFAULT 0,
    fallback_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);

-- QR Tokens table
CREATE TABLE IF NOT EXISTS qr_tokens (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    token VARCHAR(100) NOT NULL,
    expires_at BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Attendance table
CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(50) PRIMARY KEY,
    session_id VARCHAR(50) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id VARCHAR(100) NOT NULL,
    method VARCHAR(20) DEFAULT 'qr' CHECK (method IN ('qr', 'kiosk')),
    status VARCHAR(20) DEFAULT 'Present' CHECK (status IN ('Present', 'Absent', 'Late')),
    operator_id VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(session_id, student_id)
);

-- Face profiles table
CREATE TABLE IF NOT EXISTS face_profiles (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL UNIQUE,
    image_base64 TEXT NOT NULL,
    provider VARCHAR(20) DEFAULT 'mock',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Face verifications table
CREATE TABLE IF NOT EXISTS face_verifications (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(100) NOT NULL,
    similarity DECIMAL(5,2),
    provider VARCHAR(20),
    challenge VARCHAR(50),
    liveness BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at BIGINT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_session ON qr_tokens(session_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_expires ON qr_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_face_profiles_student ON face_profiles(student_id);
CREATE INDEX IF NOT EXISTS idx_face_verifications_student ON face_verifications(student_id);
CREATE INDEX IF NOT EXISTS idx_face_verifications_expires ON face_verifications(expires_at);
