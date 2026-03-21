// Importação movida para o botão 'Importar' na tela de Transações
import { redirect } from 'next/navigation';

export default function ImportPage() {
  redirect('/dashboard/transactions');
}
