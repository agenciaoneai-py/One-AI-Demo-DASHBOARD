export function calculateTypingDelay(message) {
  // Delay fijo de 2 segundos para demo rápido
  return 1500 + Math.random() * 1500; // Entre 1.5 y 3 segundos
}

export function getRandomDelay(min = 3000, max = 8000) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function simulateTyping(duration) {
  return new Promise(resolve => setTimeout(resolve, duration));
}