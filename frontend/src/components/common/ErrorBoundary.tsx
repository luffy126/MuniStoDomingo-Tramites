import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  tieneError: boolean;
}

/**
 * Última barrera de la aplicación: si un componente lanza durante el render,
 * se muestra una salida clara en vez de una pantalla blanca.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { tieneError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { tieneError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error no controlado en la interfaz', error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.tieneError) {
      return (
        <div role="alert" className="error-boundary">
          <h1>Algo salió mal</h1>
          <p>
            La aplicación encontró un problema inesperado. Tus datos guardados no se modificaron.
          </p>
          <button type="button" onClick={() => window.location.reload()}>
            Recargar la página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
