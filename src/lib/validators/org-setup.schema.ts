import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().min(2, "Department name must be at least 2 characters"),
  headEmployeeId: z.string().uuid().optional(),
  parentDeptId: z.string().uuid().optional(),
  status: z.enum(["Active", "Inactive"]),
});

export const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  code: z.string().min(2, "Category code must be at least 2 characters").toUpperCase(),
  description: z.string().min(5, "Description must be at least 5 characters"),
  status: z.enum(["Active", "Inactive"]),
});

export const employeeSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Invalid email address"),
  role: z.enum(["Admin", "Asset Manager", "Department Head", "Employee"]),
  departmentId: z.string().optional(),
});

export const promoteRoleSchema = z.object({
  role: z.enum(["Admin", "Asset Manager", "Department Head", "Employee"]),
  departmentId: z.string().optional(),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type EmployeeInput = z.infer<typeof employeeSchema>;
export type PromoteRoleInput = z.infer<typeof promoteRoleSchema>;
