/**
 * Erro de autenticação com duas faces: um código para o programa e uma frase
 * para a pessoa. A pessoa nunca vê código, stack ou vocabulário de servidor.
 */
export type AuthErrorCode =
  | 'credenciais'
  | 'rede'
  | 'cancelado'
  | 'indisponivel'
  | 'nao-configurado'
  | 'desconhecido';

const mensagens: Record<AuthErrorCode, string> = {
  credenciais: 'E-mail ou senha não conferem. Confira e tente de novo.',
  rede: 'Sem conexão no momento. Verifique a internet e tente de novo.',
  cancelado: 'Entrada cancelada.',
  indisponivel: 'Esta forma de entrar não está disponível neste aparelho.',
  'nao-configurado': 'Não foi possível entrar agora. Tente novamente em instantes.',
  desconhecido: 'Não foi possível entrar agora. Tente novamente em instantes.',
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  /** Detalhe técnico — só aparece em desenvolvimento. */
  readonly detail?: string;

  constructor(code: AuthErrorCode, detail?: string) {
    super(mensagens[code]);
    this.name = 'AuthError';
    this.code = code;
    this.detail = detail;
  }

  get userMessage(): string {
    return mensagens[this.code];
  }
}

export function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  const detail = error instanceof Error ? error.message : String(error);
  if (/network|fetch|timeout|conn/i.test(detail)) return new AuthError('rede', detail);
  return new AuthError('desconhecido', detail);
}
