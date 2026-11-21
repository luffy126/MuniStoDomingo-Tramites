import axe from 'axe-core';
import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import CampoFormulario from './components/forms/CampoFormulario';

// En jsdom los web components de Ionic guardan las props como propiedades y no
// como atributos. Los sustituimos por elementos nativos para comprobar el
// contrato ARIA que CampoFormulario les entrega.
vi.mock('@ionic/react', async () => {
  const ReactModule = await import('react');

  type IonInputMockProps = {
    onIonInput?: (evento: { detail: { value: string } }) => void;
  } & React.InputHTMLAttributes<HTMLInputElement>;

  const IonInput = ReactModule.forwardRef<HTMLInputElement, IonInputMockProps>(
    ({ onIonInput, ...props }, ref) => ReactModule.createElement('input', {
      ...props,
      ref,
      onChange: (evento: React.ChangeEvent<HTMLInputElement>) =>
        onIonInput?.({ detail: { value: evento.currentTarget.value } }),
    }),
  );

  const IonNote = ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) =>
    ReactModule.createElement('p', props, children);

  return { IonInput, IonNote };
});

/**
 * `color-contrast` se desactiva en jsdom porque no hay motor de layout y daría
 * falsos positivos; el contraste se revisa en el QA visual con tema claro/oscuro.
 */
const opciones: axe.RunOptions = {
  runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
  rules: {
    'color-contrast': { enabled: false },
    region: { enabled: false },
  },
};

const sinViolaciones = async (elemento: Element): Promise<void> => {
  const resultados = await axe.run(elemento, opciones);
  expect(
    resultados.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
  ).toEqual([]);
};

describe('Accesibilidad automatizada', () => {
  it('un formulario con etiqueta, error y botón no tiene violaciones axe WCAG A/AA', async () => {
    const { container } = render(
      <form>
        <label htmlFor="correo">Correo electrónico</label>
        <input id="correo" type="email" aria-invalid="true" aria-describedby="correo-error" />
        <p id="correo-error" role="alert">Ingresa un correo válido.</p>
        <button type="submit">Continuar</button>
      </form>,
    );

    await sinViolaciones(container);
  });

  it('CampoFormulario vincula el mensaje de error y marca el campo inválido', () => {
    const { container } = render(
      <CampoFormulario
        id="nombre"
        label="Nombre"
        value=""
        error="Ingresa tu nombre"
        onValorChange={() => undefined}
      />,
    );

    const campo = container.querySelector('#nombre');
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(campo).toHaveAttribute('aria-describedby', 'nombre-error');
    expect(container.querySelector('#nombre-error')).toHaveTextContent('Ingresa tu nombre');
  });
});
