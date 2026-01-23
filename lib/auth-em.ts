/**
 * EM(Education Manager) 인증 정보
 */
const EM_CREDENTIALS = {
  name: 'comento',
  pinCode: 'comento0804!',
};

/**
 * EM 로그인 정보를 검증합니다 (성함 + 핀코드).
 */
export function verifyEMCredentials(name: string, pinCode: string): boolean {
  return name === EM_CREDENTIALS.name && pinCode === EM_CREDENTIALS.pinCode;
}



