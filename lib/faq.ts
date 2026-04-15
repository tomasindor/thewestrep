export interface FaqItem {
  question: string;
  answer: string;
}

export const faqItems: FaqItem[] = [
  // Proceso de compra
  {
    question: "¿Cómo compro un producto?",
    answer:
      "Si el producto está **en stock**: Elegilo en el catálogo, hacé clic en 'Consultar por WhatsApp' y coordinamos la compra y entrega.\n" +
      "Si es un **encargue internacional**: Buscá el producto en el catálogo, hacé clic en 'Consultar por WhatsApp' y te asistimos en todo el proceso (importación + entrega local).",
  },
  {
    question: "¿Necesito crear una cuenta para comprar?",
    answer:
      "No es obligatorio, pero si creás una cuenta podés:\n" +
      "- Guardar tus datos de envío y pago para futuras compras.\n" +
      "- Ver el historial de tus pedidos.\n" +
      "- Recibir recomendaciones personalizadas.",
  },
  {
    question: "¿Qué métodos de pago aceptan?",
    answer:
      "Aceptamos:\n" +
      "- Tarjetas de crédito/débito (Visa, Mastercard, American Express).\n" +
      "- Transferencia bancaria.\n" +
      "- Mercado Pago (en algunos casos).\n" +
      "*Nota*: El pago se coordina por WhatsApp al momento de confirmar la compra.",
  },
  {
    question: "¿Puedo pagar en cuotas?",
    answer:
      "Sí, dependiendo del método de pago. Con tarjetas de crédito podés pagar en hasta 3 cuotas sin interés (según el banco). Consultanos por WhatsApp para más detalles.",
  },

  // Envíos y entregas
  {
    question: "¿Cuánto cuesta el envío?",
    answer:
      "- Para productos **en stock**: El costo varía según tu ubicación. Te lo confirmamos al momento de la compra.\n" +
      "- Para **encargues internacionales**: Incluimos un fee fijo de $7600 ARS para envíos locales dentro de Argentina (cubrimos los trámites aduaneros).",
  },
  {
    question: "¿Hacen envíos a todo el país?",
    answer:
      "Sí, coordinamos envíos a todo Argentina. Los tiempos y costos dependen de tu ubicación. Te los confirmamos por WhatsApp al avanzar con la compra.",
  },
  {
    question: "¿Cómo trackeo mi pedido?",
    answer:
      "Una vez despachado tu pedido, te enviamos un número de seguimiento por WhatsApp para que puedas ver el estado en tiempo real.",
  },
  {
    question: "¿Qué pasa si no estoy en mi domicilio al momento de la entrega?",
    answer:
      "El transportista intentará entregarlo hasta 2 veces. Si no estás, podés coordinar una nueva entrega o retirarlo por la sucursal más cercana. Te avisamos por WhatsApp en cada paso.",
  },

  // Devoluciones y cambios
  {
    question: "¿Puedo devolver un producto si no me gusta?",
    answer:
      "Sí, aceptamos devoluciones dentro de los **10 días hábiles** desde la entrega, siempre que el producto esté en su estado original (sin usar, con etiquetas y empaque intactos). Los costos de envío de la devolución corren por tu cuenta, salvo que el producto tenga un defecto de fábrica.",
  },
  {
    question: "¿Qué hago si el talle no me queda?",
    answer:
      "Si el talle no te queda, contactanos por WhatsApp dentro de los **5 días hábiles** desde la entrega. Evaluamos caso por caso para ofrecerte un cambio (sujeto a disponibilidad) o una devolución.",
  },
  {
    question: "¿Qué pasa si el producto llega dañado o defectuoso?",
    answer:
      "Si el producto llega dañado o con defectos de fábrica, contactanos **inmediatamente** por WhatsApp (adjuntá fotos). Nos hacemos cargo del cambio o la devolución, incluyendo los costos de envío.",
  },

  // Encargues internacionales
  {
    question: "¿Cuánto demora un encargue internacional?",
    answer:
      "Los tiempos varían según el producto y la disponibilidad del proveedor, pero en promedio demora entre **15 y 30 días hábiles** desde que confirmamos el pedido. Te damos una estimación exacta al momento de la compra.",
  },
  {
    question: "¿Los precios de los encargues incluyen impuestos?",
    answer:
      "Sí, los precios ya incluyen todos los impuestos y costos de importación. No tendrás que pagar nada extra al recibir tu pedido.",
  },
  {
    question: "¿Puedo cancelar un encargue internacional?",
    answer:
      "Podés cancelarlo **antes de que lo enviemos al proveedor** (generalmente dentro de las 48 horas desde la confirmación). Si ya fue enviado, no aceptamos cancelaciones.",
  },

  // Autenticación y cuenta
  {
    question: "¿Cómo recupero mi contraseña?",
    answer:
      "Si olvidás tu contraseña, hacé clic en 'Olvidé mi contraseña' en la página de login. Te enviaremos un correo con un enlace para restablecerla.",
  },
  {
    question: "¿Cómo cambio mis datos de perfil?",
    answer:
      "Podés editar tus datos (nombre, email, dirección, etc.) desde tu cuenta en la sección 'Perfil'. Si necesitás cambiar algo después de hacer un pedido, contactanos por WhatsApp.",
  },

  // Otros
  {
    question: "¿Puedo comprar varios productos juntos?",
    answer:
      "¡Sí! Podés consultar varios productos en un mismo mensaje por WhatsApp. Si ya los identificaste en el catálogo, la consulta será más rápida y precisa.",
  },
  {
    question: "¿Trabajan solo por WhatsApp?",
    answer:
      "Sí, el catálogo te ayuda a encontrar lo que buscás, pero toda la confirmación, coordinación y seguimiento se hace por WhatsApp. Es nuestro canal oficial para asistirte en cada paso.",
  },
];

export const homepageFaqItems = faqItems.slice(0, 3);
