/**
 * EM(Education Manager) 인증 정보
 */
const EM_CREDENTIALS = {
  name: 'comento',
  email: 'comento0804!',
};

/**
 * EM 로그인 정보를 검증합니다.
 */
export function verifyEMCredentials(name: string, email: string): boolean {
  return name === EM_CREDENTIALS.name && email === EM_CREDENTIALS.email;
}



