import { ApplicationError } from "@/protocols";

export function forbiddenError(): ApplicationError {
  return {
    name: "ForbiddenError",
    message: "This request is not allowed",
  };
}
