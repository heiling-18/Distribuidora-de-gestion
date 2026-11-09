'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoginScreen } from '@/features/auth/LoginScreen';
import { inicioDe, useSesion } from '@/features/auth/SesionProvider';
import { mensajeDeError } from '@/lib/api/cliente';

export default function LoginPage() {
  const router = useRouter();
  const { usuario, iniciarSesion } = useSesion();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Con una sesión válida no tiene sentido quedarse en el login.
  useEffect(() => {
    if (usuario) router.replace(inicioDe(usuario));
  }, [usuario, router]);

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    try {
      const usuario = await iniciarSesion(email.trim(), clave);
      router.replace(inicioDe(usuario));
    } catch (err) {
      setError(mensajeDeError(err));
      setCargando(false);
    }
  };

  return (
    <LoginScreen
      email={email}
      password={clave}
      error={error}
      cargando={cargando}
      onEmailChange={setEmail}
      onPasswordChange={setClave}
      onSubmit={entrar}
    />
  );
}
