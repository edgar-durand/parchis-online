// The characters' acted voice lines (neural TTS, MP3), served by jsDelivr from the public repo
// edgar-durand/parchis-online-voices pinned to one commit. A clip key is `<color>:<kind><n>` or
// `<color>:<emote>`; VOICE_TEXT holds the words each clip says.
export const VOICE_BASE = 'https://cdn.jsdelivr.net/gh/edgar-durand/parchis-online-voices@6bb787e072a683fafe35ba247a0e183992e5fedb/v/';
export const VOICE_TEXT = {
 "red": {
  "chatter": [
   "¡Seré el rey de este tablero!",
   "¡Tengo hambre de victoria!",
   "¡Jajaja, esto es divertidísimo!",
   "¡Nadie abandona a su tripulación!",
   "¡Por mil barriles de ron!",
   "¡Viento en popa, compañeros!"
  ],
  "exit": [
   "¡Zarpamos!",
   "¡A la mar, compañeros!"
  ],
  "goal": [
   "¡Tesoro asegurado!",
   "¡Llegué al faro! ¡Jajaja!"
  ],
  "brag": [
   "¡A la tabla, marinero!",
   "¡Toma ya!"
  ],
  "ouch": [
   "¡Ay! ¡Me las pagarás!",
   "¡Volveré, ya verás!"
  ],
  "turn": [
   "¡Mi turno! ¡Allá voy!",
   "¡Dadme esos dados!"
  ],
  "gomu": "¡Allá va mi puño!",
  "laugh": "¡Jajajajaja!",
  "cry": "¡Buaaa, qué mala suerte!",
  "nakama": "¡Somos una tripulación!",
  "king": "¡Seré el rey de los piratas!",
  "gg": "¡Buena partida, amigos!"
 },
 "yellow": {
  "chatter": [
   "¡Esta jugada está para chuparse los dedos!",
   "¡Te serviré de entrante!",
   "Mmm, ¿huele a pescado frito?",
   "¡Una patada y al agua!",
   "¡Que me aspen!",
   "¡Rayos y centellas!"
  ],
  "exit": [
   "¡Leven anclas!",
   "¡Servicio en marcha!"
  ],
  "goal": [
   "¡Plato servido, y en su punto!",
   "¡A salvo en puerto!"
  ],
  "brag": [
   "¡Al fondo del mar contigo!",
   "¡Directo a la sartén!"
  ],
  "ouch": [
   "¡Mi traje! ¡Esto no queda así!",
   "¡Rayos! ¡Otra vez al nido!"
  ],
  "turn": [
   "¡Marchando una jugada!",
   "¡Atención, que voy!"
  ],
  "gomu": "¡Una patada y listo!",
  "laugh": "¡Jajaja, qué delicia!",
  "cry": "¡Qué tragedia culinaria!",
  "nakama": "¡Por mi tripulación, lo que sea!",
  "king": "¡El mejor cocinero de los mares!",
  "gg": "¡Ha sido un placer, caballeros!"
 },
 "green": {
  "chatter": [
   "Tres espadas, cero piedad.",
   "¿Hacia dónde quedaba el faro?",
   "Hmph. Aburrido.",
   "Despiértame cuando me toque.",
   "No me hagas perder el tiempo.",
   "Arrr."
  ],
  "exit": [
   "Vamos.",
   "Por fin, algo de acción."
  ],
  "goal": [
   "Hmph. Llegué.",
   "Misión cumplida."
  ],
  "brag": [
   "Corte limpio.",
   "Ni lo viste venir."
  ],
  "ouch": [
   "Tsk. Esto no ha terminado.",
   "Grr... volveré."
  ],
  "turn": [
   "Me toca.",
   "Apártense."
  ],
  "gomu": "Prepárate.",
  "laugh": "Je. Patético.",
  "cry": "Tsk. Qué mala suerte.",
  "nakama": "Mi tripulación es lo primero.",
  "king": "Seré el mejor espadachín del mundo.",
  "gg": "Buena pelea."
 },
 "blue": {
  "chatter": [
   "¡El mar está de mi lado!",
   "Paciencia, como la marea.",
   "Un buen pirata no corre: navega.",
   "¡Ola gigante en camino!",
   "¡Por las barbas de Neptuno!",
   "Escuchad al mar, grumetes."
  ],
  "exit": [
   "¡Soltad amarras!",
   "La marea nos llama."
  ],
  "goal": [
   "Puerto seguro, al fin.",
   "El faro me guió."
  ],
  "brag": [
   "¡La marea te arrastra!",
   "¡Al fondo del océano!"
  ],
  "ouch": [
   "Una ola en contra... volveré.",
   "Hmm. El mar es caprichoso."
  ],
  "turn": [
   "Mi marea sube.",
   "Ahora navego yo."
  ],
  "gomu": "¡Siente la fuerza del mar!",
  "laugh": "Jo, jo, jo.",
  "cry": "El mar me ha dado la espalda.",
  "nakama": "Juntos somos el océano.",
  "king": "Que el mar decida quién reina.",
  "gg": "Honorable partida."
 }
} as const;
export function voiceUrl(clip: string): string {
  return `${VOICE_BASE}${clip.replace(':', '-')}.mp3`;
}
