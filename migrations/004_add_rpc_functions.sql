-- Migration: 004_add_rpc_functions.sql
-- Description: 添加认证和管理相关的 RPC 函数
-- Date: 2026-06-02

BEGIN;

CREATE OR REPLACE FUNCTION hash_password(p_password TEXT)
RETURNS TABLE(hashed_password TEXT) AS $$
BEGIN
    RETURN QUERY SELECT crypt(p_password, gen_salt('bf'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION authenticate_user(p_username TEXT, p_password TEXT)
RETURNS TABLE(
    success BOOLEAN,
    message TEXT,
    id BIGINT,
    username TEXT,
    real_name TEXT,
    role TEXT,
    email TEXT,
    college_id BIGINT,
    grade TEXT,
    status SMALLINT
) AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT * INTO v_user FROM "user" WHERE username = p_username;
    
    IF v_user IS NULL THEN
        RETURN QUERY SELECT false, '用户名或密码错误', NULL::BIGINT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BIGINT, NULL::TEXT, NULL::SMALLINT;
        RETURN;
    END IF;
    
    IF v_user.status != 1 THEN
        RETURN QUERY SELECT false, '账户已被禁用', NULL::BIGINT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BIGINT, NULL::TEXT, NULL::SMALLINT;
        RETURN;
    END IF;
    
    IF crypt(p_password, v_user.password) != v_user.password THEN
        RETURN QUERY SELECT false, '用户名或密码错误', NULL::BIGINT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT, NULL::BIGINT, NULL::TEXT, NULL::SMALLINT;
        RETURN;
    END IF;
    
    RETURN QUERY SELECT 
        true, 
        '认证成功',
        v_user.id,
        v_user.username,
        v_user.real_name,
        v_user.role,
        v_user.email,
        v_user.college_id,
        v_user.grade,
        v_user.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION register_user(
    p_username TEXT,
    p_password TEXT,
    p_real_name TEXT,
    p_role TEXT DEFAULT 'STUDENT',
    p_email TEXT DEFAULT NULL,
    p_college_id BIGINT DEFAULT NULL,
    p_grade TEXT DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
    v_hashed_password TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM "user" WHERE username = p_username) THEN
        RETURN QUERY SELECT false, '用户名已存在';
        RETURN;
    END IF;
    
    v_hashed_password := crypt(p_password, gen_salt('bf'));
    
    INSERT INTO "user" (
        username, password, real_name, role, email, college_id, grade, status
    ) VALUES (
        p_username, v_hashed_password, p_real_name, p_role, p_email, p_college_id, p_grade, 1
    );
    
    RETURN QUERY SELECT true, '注册成功';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION enroll_course(p_student_id BIGINT, p_course_id BIGINT)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
    v_course RECORD;
    v_count INTEGER;
    v_max_courses INTEGER;
BEGIN
    SELECT * INTO v_course FROM "course" WHERE id = p_course_id;
    IF v_course IS NULL THEN
        RETURN QUERY SELECT false, '课程不存在';
        RETURN;
    END IF;
    
    IF v_course.status != 1 THEN
        RETURN QUERY SELECT false, '课程未开放';
        RETURN;
    END IF;
    
    IF v_course.current_students >= v_course.capacity THEN
        RETURN QUERY SELECT false, '课程已满';
        RETURN;
    END IF;
    
    IF EXISTS (SELECT 1 FROM course_selection WHERE student_id = p_student_id AND course_id = p_course_id AND status = 1) THEN
        RETURN QUERY SELECT false, '已选择该课程';
        RETURN;
    END IF;
    
    SELECT config_value::INTEGER INTO v_max_courses FROM config WHERE config_key = 'max_courses_per_student';
    v_max_courses := COALESCE(v_max_courses, 5);
    
    SELECT COUNT(*) INTO v_count FROM course_selection WHERE student_id = p_student_id AND status = 1;
    IF v_count >= v_max_courses THEN
        RETURN QUERY SELECT false, '已达到最大选课数量';
        RETURN;
    END IF;
    
    INSERT INTO course_selection (student_id, course_id, status, completed)
    VALUES (p_student_id, p_course_id, 1, 0)
    ON CONFLICT (student_id, course_id) DO UPDATE SET status = 1;
    
    RETURN QUERY SELECT true, '选课成功';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION drop_course(p_student_id BIGINT, p_course_id BIGINT)
RETURNS TABLE(success BOOLEAN, message TEXT) AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT * INTO v_record FROM course_selection 
    WHERE student_id = p_student_id AND course_id = p_course_id AND status = 1;
    
    IF v_record IS NULL THEN
        RETURN QUERY SELECT false, '未选择该课程';
        RETURN;
    END IF;
    
    UPDATE course_selection SET status = 0 WHERE id = v_record.id;
    
    RETURN QUERY SELECT true, '退课成功';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;