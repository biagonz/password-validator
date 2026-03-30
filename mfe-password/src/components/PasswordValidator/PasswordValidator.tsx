import { useState } from "react";
import { validatePassword } from "@/services/password.service";
import styles from "./styles.module.scss";
import { fieldValidator, ValidationResult } from "@/utils/field-validator";
import { CloseEyeIcon, OpenEyeIcon } from "@/assets";

export default function PasswordValidator() {
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const localResult = fieldValidator(password);
      if (!localResult.valid) {
        setResult(localResult);
        return;
      }
      const data = await validatePassword(password);
      setResult(data);
    } catch {
      setError(
        "Falha ao conectar ao serviço de validação. O backend está rodando?",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Validador de Senha</h2>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setResult(null);
            }}
            placeholder="Digite sua senha"
            className={styles.input}
            aria-label="Campo de senha"
          />
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          >
            {showPassword ? <CloseEyeIcon /> : <OpenEyeIcon />}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading || password.length === 0}
          className={styles.button}
        >
          {loading ? "Validando..." : "Validar"}
        </button>
      </form>

      {error && (
        <div className={styles.errorBanner} role="alert">
          {error}
        </div>
      )}

      {result && (
        <div
          className={`${styles.result} ${result.valid ? styles.valid : styles.invalid}`}
          role="status"
          aria-live="polite"
        >
          <p className={styles.resultStatus}>
            {result.valid ? "✓ Senha válida" : "✗ Senha inválida"}
          </p>

          {!result.valid && result.errors.length > 0 && (
            <ul className={styles.errorList}>
              {result.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
