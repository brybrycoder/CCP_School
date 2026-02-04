import { signIn, fetchAuthSession, signOut } from "aws-amplify/auth";

export async function login(email: string, password: string) {
  await signIn({ username: email, password });
  const session = await fetchAuthSession();
  return {
    accessToken: session.tokens?.accessToken?.toString(),
    idToken: session.tokens?.idToken?.toString(),
  };
}

export async function logout() {
  await signOut();
}