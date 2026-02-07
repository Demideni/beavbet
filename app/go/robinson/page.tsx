import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const ACCESS_COOKIE = "PULZ_AT";

export default function GoRobinson() {
  const hasAuth = Boolean(cookies().get(ACCESS_COOKIE)?.value);
  redirect(hasAuth ? "/games/robinson" : "/register");
}
