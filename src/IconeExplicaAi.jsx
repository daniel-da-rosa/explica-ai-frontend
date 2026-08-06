// Balão de chat + pontos de "digitando" + lupa — sem fundo/badge próprio, formas transparentes
// (só o contorno branco + acento ciano); pensado pra flutuar direto sobre o slate escuro da
// aplicação, sem caixa em volta. Ver docs/assets/icone-reduzido.svg no repo backend.
export default function IconeExplicaAi({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="60 40 400 400" fill="none" aria-hidden="true">
      <rect x="76" y="64" width="360" height="284" rx="120" fill="none" stroke="#F1F5F9" strokeWidth="20" />
      <path d="M150,330 L138,422 L232,338" fill="none" stroke="#F1F5F9" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="196" cy="200" r="20" fill="#22D3EE" />
      <circle cx="256" cy="200" r="20" fill="#22D3EE" />
      <circle cx="316" cy="200" r="20" fill="#22D3EE" />
      <circle cx="380" cy="300" r="76" fill="none" stroke="#F1F5F9" strokeWidth="22" />
      <line x1="434" y1="354" x2="458" y2="378" stroke="#F1F5F9" strokeWidth="28" strokeLinecap="round" />
    </svg>
  );
}
