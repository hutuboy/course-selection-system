import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://knenakrvlkyikwnwsxgm.supabase.co";
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const JWT_SECRET = Deno.env.get("JWT_SECRET") || "course-selection-secret-2024";

function cors() {
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    };
}
function ok(status: number, data: unknown) {
    return new Response(JSON.stringify(data), { status, headers: { ...cors(), "Content-Type": "application/json" } });
}
function fail(status: number, message: string) { return ok(status, { success: false, message }); }
function db() { return createClient(SUPABASE_URL, SUPABASE_KEY); }

const enc = new TextEncoder();
function b64url(buf: Uint8Array): string {
    return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signJwt(payload: Record<string, unknown>): Promise<string> {
    const header = b64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
    const body = b64url(enc.encode(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 86400 })));
    const key = await crypto.subtle.importKey("raw", enc.encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${header}.${body}`)));
    return `${header}.${body}.${b64url(sig)}`;
}

async function verifyJwt(token: string): Promise<Record<string, unknown> | null> {
    try {
        const [h, p, s] = token.split(".");
        if (!h || !p || !s) return null;
        const key = await crypto.subtle.importKey("raw", enc.encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
        const expected = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(`${h}.${p}`)));
        const actual = Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
        if (expected.length !== actual.length) return null;
        for (let i = 0; i < expected.length; i++) { if (expected[i] !== actual[i]) return null; }
        const payload = JSON.parse(atob(p.replace(/-/g, "+").replace(/_/g, "/")));
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
        return payload;
    } catch { return null; }
}

async function getUser(req: Request): Promise<Record<string, unknown> | null> {
    const auth = req.headers.get("authorization");
    if (!auth?.startsWith("Bearer ")) return null;
    return verifyJwt(auth.slice(7));
}
function requireUser(u: Record<string, unknown> | null) { if (!u) throw new Error("未认证"); return u; }

async function authHandler(req: Request, path: string[]) {
    if (req.method === "POST" && path[0] === "login") {
        const { username, password } = await req.json();
        if (!username || !password) return fail(400, "用户名和密码不能为空");
        const { data: r, error } = await db().rpc("authenticate_user", { p_username: username, p_password: password });
        if (error) return fail(500, error.message);
        const u = r as Record<string, unknown>;
        if (!u?.success) return fail(401, (u?.message as string) || "用户名或密码错误");
        const token = await signJwt({ id: u.id, username: u.username, role: u.role, realName: u.real_name, collegeId: u.college_id });
        return ok(200, {
            success: true,
            data: {
                user: { id: u.id, username: u.username, realName: u.real_name, role: u.role, email: u.email, collegeId: u.college_id, grade: u.grade },
                accessToken: token,
            },
        });
    }
    if (req.method === "POST" && path[0] === "register") {
        const b = await req.json();
        const { data: r, error } = await db().rpc("register_user", {
            p_username: b.username, p_password: b.password,
            p_real_name: b.realName || b.real_name,
            p_role: b.role || "STUDENT",
            p_email: b.email || null,
            p_college_id: b.collegeId || b.college_id || null,
            p_grade: b.grade || null,
        });
        if (error) return fail(400, error.message);
        const res = r as Record<string, unknown>;
        if (!res?.success) return fail(400, (res?.message as string) || "注册失败");
        return ok(201, { success: true, message: (res.message as string) || "注册成功" });
    }
    if (path[0] === "profile") {
        const user = await getUser(req);
        if (!user) return fail(401, "未认证");
        const { data: u, error } = await db().from("user").select("id,username,real_name,role,email,college_id,grade,status").eq("id", user.id).single();
        if (error || !u) return fail(404, "用户不存在");
        return ok(200, { success: true, data: { id: u.id, username: u.username, realName: u.real_name, role: u.role, email: u.email, collegeId: u.college_id, grade: u.grade } });
    }
    return fail(404, "接口不存在");
}

async function courseHandler(req: Request, path: string[]) {
    if (req.method === "GET" && path.length === 0) {
        const url = new URL(req.url);
        const keyword = url.searchParams.get("keyword");
        const category = url.searchParams.get("category");
        const collegeId = url.searchParams.get("collegeId");
        const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
        const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "20")));
        let q = db().from("v_course_list").select("*", { count: "exact" }).eq("status", 1);
        if (keyword) q = q.or(`name.ilike.%${keyword}%,teacher_name.ilike.%${keyword}%`);
        if (category) q = q.eq("category", category);
        if (collegeId) q = q.eq("college_id", parseInt(collegeId));
        const from = (page - 1) * limit;
        const { data, count, error } = await q.range(from, from + limit - 1).order("id");
        if (error) return fail(500, error.message);
        return ok(200, { success: true, data, pagination: { page, limit, total: count || 0, totalPages: Math.ceil((count || 0) / limit) } });
    }
    if (req.method === "GET" && path.length === 1) {
        const { data, error } = await db().from("v_course_list").select("*").eq("id", parseInt(path[0])).single();
        if (error || !data) return fail(404, "课程不存在");
        return ok(200, { success: true, data });
    }
    return fail(404, "接口不存在");
}

async function enrollHandler(req: Request, path: string[]) {
    const user = await getUser(req);
    if (req.method === "GET" && path[0] === "my") {
        requireUser(user);
        const { data, error } = await db().from("v_student_courses").select("*").eq("student_id", user!.id);
        if (error) return fail(500, error.message);
        return ok(200, { success: true, data: data || [] });
    }
    if (req.method === "POST" && path.length === 1 && path[0] !== "my") {
        requireUser(user);
        const { data: r, error } = await db().rpc("enroll_course", { p_student_id: user!.id, p_course_id: parseInt(path[0]) });
        if (error) return fail(400, error.message);
        const res = r as Record<string, unknown>;
        if (!res?.success) return fail(400, (res?.message as string) || "选课失败");
        return ok(201, { success: true, message: (res.message as string) || "选课成功" });
    }
    if (req.method === "DELETE" && path.length === 1) {
        requireUser(user);
        const { data: r, error } = await db().rpc("drop_course", { p_student_id: user!.id, p_course_id: parseInt(path[0]) });
        if (error) return fail(400, error.message);
        const res = r as Record<string, unknown>;
        if (!res?.success) return fail(400, (res?.message as string) || "退课失败");
        return ok(200, { success: true, message: (res.message as string) || "退课成功" });
    }
    return fail(404, "接口不存在");
}

async function adminHandler(req: Request, path: string[]) {
    const user = await getUser(req);
    if (!user || user.role !== "ADMIN") return fail(403, "需要管理员权限");
    
    if (path[0] === "dashboard") {
        const [users, courses, selections] = await Promise.all([
            db().from("user").select("id", { count: "exact", head: true }),
            db().from("course").select("id", { count: "exact", head: true }),
            db().from("course_selection").select("id", { count: "exact", head: true }).eq("status", 1),
        ]);
        return ok(200, { success: true, data: { totalUsers: users.count || 0, totalCourses: courses.count || 0, totalSelections: selections.count || 0 } });
    }
    
    if (path[0] === "users") {
        if (req.method === "GET") {
            const { data, error } = await db().from("user").select("id,username,real_name,role,email,college_id,grade,status,create_time").order("id");
            if (error) return fail(500, error.message);
            return ok(200, { success: true, data: data || [] });
        }
        if (req.method === "POST") {
            const b = await req.json();
            const { data: r, error } = await db().rpc("register_user", {
                p_username: b.username,
                p_password: b.password,
                p_real_name: b.real_name || b.realName,
                p_role: b.role || "STUDENT",
                p_email: b.email || null,
                p_college_id: b.college_id || b.collegeId || null,
                p_grade: b.grade || null,
            });
            if (error) return fail(400, error.message);
            const res = r as Record<string, unknown>;
            if (!res?.success) return fail(400, (res?.message as string) || "创建用户失败");
            return ok(201, { success: true, message: (res.message as string) || "创建成功" });
        }
        if (req.method === "PUT" && path.length === 2) {
            const userId = parseInt(path[1]);
            const b = await req.json();
            const updateData: Record<string, unknown> = {};
            if (b.username) updateData.username = b.username;
            if (b.real_name || b.realName) updateData.real_name = b.real_name || b.realName;
            if (b.password) {
                const { data: r, error: hashError } = await db().rpc("hash_password", { p_password: b.password });
                if (hashError) return fail(500, hashError.message);
                updateData.password = (r as Record<string, unknown>)?.hashed_password;
            }
            if (b.role) updateData.role = b.role;
            if (b.email) updateData.email = b.email;
            if (b.college_id || b.collegeId) updateData.college_id = b.college_id || b.collegeId;
            if (b.grade) updateData.grade = b.grade;
            if (b.status !== undefined) updateData.status = b.status;
            const { error } = await db().from("user").update(updateData).eq("id", userId);
            if (error) return fail(500, error.message);
            return ok(200, { success: true, message: "更新成功" });
        }
        if (req.method === "DELETE" && path.length === 2) {
            const userId = parseInt(path[1]);
            const { error } = await db().from("user").delete().eq("id", userId);
            if (error) return fail(500, error.message);
            return ok(200, { success: true, message: "删除成功" });
        }
        return fail(405, "方法不允许");
    }
    
    if (path[0] === "courses") {
        if (req.method === "GET") {
            const { data, error } = await db().from("v_course_list").select("*").order("id");
            if (error) return fail(500, error.message);
            return ok(200, { success: true, data: data || [] });
        }
        if (req.method === "POST") {
            const b = await req.json();
            const { error } = await db().from("course").insert({
                name: b.name,
                category: b.category,
                credit: b.credit,
                capacity: b.max_capacity || b.capacity,
                teacher_id: b.teacher_id,
                time_slot: b.time_slot,
                location: b.location,
                description: b.description,
                semester: b.semester,
                start_date: b.start_date,
                status: b.status || 1,
                current_students: 0,
            });
            if (error) return fail(400, error.message);
            return ok(201, { success: true, message: "创建成功" });
        }
        if (req.method === "PUT" && path.length === 2) {
            const courseId = parseInt(path[1]);
            const b = await req.json();
            const updateData: Record<string, unknown> = {};
            if (b.name) updateData.name = b.name;
            if (b.category) updateData.category = b.category;
            if (b.credit !== undefined) updateData.credit = b.credit;
            if (b.max_capacity !== undefined || b.capacity !== undefined) updateData.capacity = b.max_capacity || b.capacity;
            if (b.teacher_id !== undefined) updateData.teacher_id = b.teacher_id;
            if (b.time_slot) updateData.time_slot = b.time_slot;
            if (b.location) updateData.location = b.location;
            if (b.description !== undefined) updateData.description = b.description;
            if (b.semester) updateData.semester = b.semester;
            if (b.start_date) updateData.start_date = b.start_date;
            if (b.status !== undefined) updateData.status = b.status;
            const { error } = await db().from("course").update(updateData).eq("id", courseId);
            if (error) return fail(500, error.message);
            return ok(200, { success: true, message: "更新成功" });
        }
        if (req.method === "DELETE" && path.length === 2) {
            const courseId = parseInt(path[1]);
            const { error } = await db().from("course").delete().eq("id", courseId);
            if (error) return fail(500, error.message);
            return ok(200, { success: true, message: "删除成功" });
        }
        return fail(405, "方法不允许");
    }
    
    if (path[0] === "enrollments") {
        if (req.method === "GET") {
            const { data, error } = await db().from("v_student_courses").select("*").order("id", { ascending: false });
            if (error) return fail(500, error.message);
            return ok(200, { success: true, data: data || [] });
        }
        return fail(405, "方法不允许");
    }
    
    if (path[0] === "config") {
        if (req.method === "GET") {
            const { data, error } = await db().from("config").select("*").order("config_key");
            if (error) return fail(500, error.message);
            return ok(200, { success: true, data: data || [] });
        }
        if (req.method === "PUT") {
            const b = await req.json();
            const { error } = await db().from("config").update({ config_value: b.config_value || b.value }).eq("config_key", b.config_key || b.key);
            if (error) return fail(500, error.message);
            return ok(200, { success: true, message: "配置已更新" });
        }
    }
    
    return fail(404, "接口不存在");
}

async function collegeHandler(req: Request) {
    if (req.method !== "GET") return fail(405, "方法不允许");
    const { data, error } = await db().from("college").select("*").order("id");
    if (error) return fail(500, error.message);
    return ok(200, { success: true, data: data || [] });
}

Deno.serve(async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors() });
    try {
        const pathname = new URL(req.url).pathname;
        const parts = pathname.split("/").filter(Boolean);
        const route = parts.length > 0 ? parts.slice(1) : [];
        if (route.length === 0 || (route.length === 1 && route[0] === "health")) {
            return ok(200, { success: true, message: "选课系统 API 运行正常", timestamp: new Date().toISOString() });
        }
        switch (route[0]) {
            case "auth":        return await authHandler(req, route.slice(1));
            case "courses":     return await courseHandler(req, route.slice(1));
            case "enrollments": return await enrollHandler(req, route.slice(1));
            case "admin":       return await adminHandler(req, route.slice(1));
            case "colleges":    return await collegeHandler(req);
            default:            return fail(404, "接口不存在");
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "服务器内部错误";
        console.error("Unhandled error:", msg);
        return fail(500, msg);
    }
});