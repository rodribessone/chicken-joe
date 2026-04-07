// ---------------------------------------------------------------------------
// Chicken Joe — translations
// Languages: en (English), es (Spanish), pt (Brazilian Portuguese)
// ---------------------------------------------------------------------------

export const LANGS = {
  en: { label: 'EN', flag: '🇦🇺', name: 'English' },
  es: { label: 'ES', flag: '🇪🇸', name: 'Español' },
  pt: { label: 'PT', flag: '🇧🇷', name: 'Português' },
}

// ---------------------------------------------------------------------------
// UI strings
// ---------------------------------------------------------------------------
export const ui = {
  en: {
    // Header
    'header.region': 'Sunshine Coast, QLD',

    // Search / nearby
    'search.placeholder': 'Search beaches...',
    'search.no_results': 'No beaches found for',
    'search.suggest': '+ Suggest it',
    'nearby.title': '📍 Near you',

    // Conditions card
    'conditions.wave_height': 'Wave Height',
    'conditions.period': 'Period',
    'conditions.wind': 'Wind',
    'conditions.water_temp': 'Water Temp',
    'conditions.swell': 'Swell',
    'conditions.wave_dir': 'Wave Direction',
    'conditions.updated': 'Updated',
    'conditions.refresh': 'Refresh',
    'conditions.gusts': 'Gusts',
    'conditions.water': 'water',
    'conditions.swell_from': 'Swell from',
    'conditions.wave_period': 'Wave Period',
    'conditions.energy': 'Energy',

    // Wave height scale
    'wave.flat': 'Flat',
    'wave.ankle_knee': 'Ankle–knee',
    'wave.knee_waist': 'Knee–waist',
    'wave.waist_chest': 'Waist–chest',
    'wave.head_high': 'Head high',
    'wave.overhead': 'Overhead',
    'wave.double_overhead': 'Double overhead',
    'wave.xxl': 'XXL',

    // Surf score labels
    'score.flat': 'Flat',
    'score.poor': 'Poor',
    'score.fair': 'Fair',
    'score.good': 'Good',
    'score.epic': 'Epic',

    // Tides
    'tides.title': "Today's Tides",
    'tides.approximate': 'approximate',
    'tides.high': 'High',
    'tides.low': 'Low',

    // Report feed
    'reports.title': 'Community Reports',
    'reports.today_title': "Today's Reports",
    'reports.empty': 'No reports yet.',
    'reports.no_today': 'No reports today yet.',
    'reports.be_first': 'Be the first to report conditions!',
    'reports.show_history': 'Show past reports',
    'reports.hide_history': 'Hide past reports',
    'reports.history_title': 'Recent History',
    'reports.history_empty': 'No reports in the past week.',

    // Report FAB + modal
    'report.btn': 'Report conditions',
    'report.modal_title': 'Report Conditions',
    'report.beach': 'Beach',
    'report.whats_like': "What's it like out there?",
    'report.placeholder': 'E.g. Clean 1.5m waves, light offshore, barely anyone out...',
    'report.tags_label': 'Quick tags (optional)',
    'report.submit': '🤙 Post Report',
    'report.submitting': 'Posting...',
    'report.error_short': 'Write at least a few words.',
    'report.error_fail': 'Failed to submit. Please try again.',

    // Suggest beach modal
    'suggest.title': 'Suggest a Beach',
    'suggest.subtitle': "We'll review it and add it soon",
    'suggest.search_placeholder': 'Search beach name...',
    'suggest.search_hint': 'e.g. Noosa, Byron Bay, Bondi Beach',
    'suggest.searching': 'Searching...',
    'suggest.no_results': 'No results found. Try a different name.',
    'suggest.pick_prompt': 'Select a location from the results below',
    'suggest.confirm_title': 'Confirm location',
    'suggest.name': 'Beach Name',
    'suggest.state': 'State',
    'suggest.notes': 'Notes (optional)',
    'suggest.view_larger': 'View larger map ↗',
    'suggest.change_location': '← Search again',
    'suggest.submit': '🏄 Submit Beach',
    'suggest.submitting': 'Submitting...',
    'suggest.success_title': 'Thanks, legend!',
    'suggest.success_msg': "We'll review your suggestion and add it to the lineup soon.",
    'suggest.success_btn': 'Back to surf check',
    'suggest.err_name': 'Beach name is required.',
    'suggest.err_fail': 'Failed to submit. Please try again.',

    // Glossary
    'glossary.btn': '📖 Surf Guide',
    'glossary.title': "Beginner's Surf Guide",
    'glossary.subtitle': 'Tap any term to learn what it means',

    // Ad
    'ad.label': 'Advertisement',
  },

  es: {
    'header.region': 'Sunshine Coast, QLD',

    'search.placeholder': 'Buscar playas...',
    'search.no_results': 'Sin resultados para',
    'search.suggest': '+ Sugerirla',
    'nearby.title': '📍 Cerca tuyo',

    'conditions.wave_height': 'Altura de Ola',
    'conditions.period': 'Período',
    'conditions.wind': 'Viento',
    'conditions.water_temp': 'Temp. Agua',
    'conditions.swell': 'Mar de Fondo',
    'conditions.wave_dir': 'Dirección',
    'conditions.updated': 'Actualizado',
    'conditions.refresh': 'Actualizar',
    'conditions.gusts': 'Ráfagas',
    'conditions.water': 'agua',
    'conditions.swell_from': 'Swell desde',
    'conditions.wave_period': 'Período de ola',
    'conditions.energy': 'Energía',

    'wave.flat': 'Plano',
    'wave.ankle_knee': 'Tobillo–rodilla',
    'wave.knee_waist': 'Rodilla–cintura',
    'wave.waist_chest': 'Cintura–pecho',
    'wave.head_high': 'Altura de cabeza',
    'wave.overhead': 'Sobre la cabeza',
    'wave.double_overhead': 'Doble altura',
    'wave.xxl': 'XXL',

    'score.flat': 'Plano',
    'score.poor': 'Malo',
    'score.fair': 'Regular',
    'score.good': 'Bueno',
    'score.epic': 'Épico',

    'tides.title': 'Mareas de Hoy',
    'tides.approximate': 'aproximado',
    'tides.high': 'Pleamar',
    'tides.low': 'Bajamar',

    'reports.title': 'Reportes de la Comunidad',
    'reports.today_title': 'Reportes de Hoy',
    'reports.empty': 'Sin reportes todavía.',
    'reports.no_today': 'Sin reportes hoy todavía.',
    'reports.be_first': '¡Sé el primero en reportar condiciones!',
    'reports.show_history': 'Ver reportes anteriores',
    'reports.hide_history': 'Ocultar anteriores',
    'reports.history_title': 'Historial Reciente',
    'reports.history_empty': 'Sin reportes en la última semana.',

    'report.btn': 'Reportar condiciones',
    'report.modal_title': 'Reportar Condiciones',
    'report.beach': 'Playa',
    'report.whats_like': '¿Cómo está el mar?',
    'report.placeholder': 'Ej. Olas parejas de 1.5m, viento offshore suave, poca gente...',
    'report.tags_label': 'Tags rápidos (opcional)',
    'report.submit': '🤙 Publicar Reporte',
    'report.submitting': 'Publicando...',
    'report.error_short': 'Escribí al menos unas palabras.',
    'report.error_fail': 'Error al enviar. Intentá de nuevo.',

    'suggest.title': 'Sugerir una Playa',
    'suggest.subtitle': 'La revisamos y la agregamos pronto',
    'suggest.search_placeholder': 'Buscá el nombre de la playa...',
    'suggest.search_hint': 'Ej. Noosa, Byron Bay, Bondi Beach',
    'suggest.searching': 'Buscando...',
    'suggest.no_results': 'Sin resultados. Probá con otro nombre.',
    'suggest.pick_prompt': 'Seleccioná una ubicación de los resultados',
    'suggest.confirm_title': 'Confirmar ubicación',
    'suggest.name': 'Nombre de la Playa',
    'suggest.state': 'Estado',
    'suggest.notes': 'Notas (opcional)',
    'suggest.view_larger': 'Ver mapa más grande ↗',
    'suggest.change_location': '← Buscar de nuevo',
    'suggest.submit': '🏄 Enviar Playa',
    'suggest.submitting': 'Enviando...',
    'suggest.success_title': '¡Gracias, crack!',
    'suggest.success_msg': 'Revisamos tu sugerencia y la sumamos al lineup pronto.',
    'suggest.success_btn': 'Volver al surf check',
    'suggest.err_name': 'El nombre de la playa es obligatorio.',
    'suggest.err_fail': 'Error al enviar. Intentá de nuevo.',

    'glossary.btn': '📖 Guía de Surf',
    'glossary.title': 'Guía de Surf para Principiantes',
    'glossary.subtitle': 'Tocá cualquier término para saber qué significa',

    'ad.label': 'Publicidad',
  },

  pt: {
    'header.region': 'Sunshine Coast, QLD',

    'search.placeholder': 'Buscar praias...',
    'search.no_results': 'Nenhuma praia encontrada para',
    'search.suggest': '+ Sugerir',
    'nearby.title': '📍 Perto de você',

    'conditions.wave_height': 'Altura da Onda',
    'conditions.period': 'Período',
    'conditions.wind': 'Vento',
    'conditions.water_temp': 'Temp. Água',
    'conditions.swell': 'Swell',
    'conditions.wave_dir': 'Direção',
    'conditions.updated': 'Atualizado',
    'conditions.refresh': 'Atualizar',
    'conditions.gusts': 'Rajadas',
    'conditions.water': 'água',
    'conditions.swell_from': 'Swell de',
    'conditions.wave_period': 'Período da onda',
    'conditions.energy': 'Energia',

    'wave.flat': 'Plano',
    'wave.ankle_knee': 'Tornozelo–joelho',
    'wave.knee_waist': 'Joelho–cintura',
    'wave.waist_chest': 'Cintura–peito',
    'wave.head_high': 'Altura da cabeça',
    'wave.overhead': 'Acima da cabeça',
    'wave.double_overhead': 'Duas alturas',
    'wave.xxl': 'XXL',

    'score.flat': 'Plano',
    'score.poor': 'Ruim',
    'score.fair': 'Regular',
    'score.good': 'Bom',
    'score.epic': 'Épico',

    'tides.title': 'Marés de Hoje',
    'tides.approximate': 'aproximado',
    'tides.high': 'Maré Alta',
    'tides.low': 'Maré Baixa',

    'reports.title': 'Reportes da Comunidade',
    'reports.today_title': 'Reportes de Hoje',
    'reports.empty': 'Nenhum reporte ainda.',
    'reports.no_today': 'Nenhum reporte hoje ainda.',
    'reports.be_first': 'Seja o primeiro a reportar as condições!',
    'reports.show_history': 'Ver reportes anteriores',
    'reports.hide_history': 'Ocultar anteriores',
    'reports.history_title': 'Histórico Recente',
    'reports.history_empty': 'Nenhum reporte na última semana.',

    'report.btn': 'Reportar condições',
    'report.modal_title': 'Reportar Condições',
    'report.beach': 'Praia',
    'report.whats_like': 'Como está o mar?',
    'report.placeholder': 'Ex. Ondas limpas de 1.5m, vento offshore fraco, quase ninguém...',
    'report.tags_label': 'Tags rápidas (opcional)',
    'report.submit': '🤙 Publicar Reporte',
    'report.submitting': 'Publicando...',
    'report.error_short': 'Escreva pelo menos algumas palavras.',
    'report.error_fail': 'Falha ao enviar. Tente novamente.',

    'suggest.title': 'Sugerir uma Praia',
    'suggest.subtitle': 'Vamos revisar e adicionar em breve',
    'suggest.search_placeholder': 'Buscar nome da praia...',
    'suggest.search_hint': 'Ex. Noosa, Byron Bay, Bondi Beach',
    'suggest.searching': 'Buscando...',
    'suggest.no_results': 'Nenhum resultado. Tente outro nome.',
    'suggest.pick_prompt': 'Selecione uma localização dos resultados',
    'suggest.confirm_title': 'Confirmar localização',
    'suggest.name': 'Nome da Praia',
    'suggest.state': 'Estado',
    'suggest.notes': 'Notas (opcional)',
    'suggest.view_larger': 'Ver mapa maior ↗',
    'suggest.change_location': '← Buscar novamente',
    'suggest.submit': '🏄 Enviar Praia',
    'suggest.submitting': 'Enviando...',
    'suggest.success_title': 'Valeu, mano!',
    'suggest.success_msg': 'Vamos revisar sua sugestão e adicionar ao lineup em breve.',
    'suggest.success_btn': 'Voltar ao surf check',
    'suggest.err_name': 'O nome da praia é obrigatório.',
    'suggest.err_fail': 'Falha ao enviar. Tente novamente.',

    'glossary.btn': '📖 Guia de Surf',
    'glossary.title': 'Guia de Surf para Iniciantes',
    'glossary.subtitle': 'Toque em qualquer termo para saber o que significa',

    'ad.label': 'Publicidade',
  },
}

// ---------------------------------------------------------------------------
// Glossary terms (per language)
// ---------------------------------------------------------------------------
export const glossary = {
  en: [
    {
      icon: '🎯',
      term: 'Surf Score',
      desc: 'Our 0–10 rating combining wave height, period, and wind. 10 is perfect. Below 3 means it\'s flat or blown out. The score also adjusts based on community reports.',
    },
    {
      icon: '🌊',
      term: 'Wave Height',
      desc: 'The vertical distance from the trough (bottom) to the crest (top) of the wave. 1–2m is a solid session for most surfers. The display shows it in meters.',
    },
    {
      icon: '⏱️',
      term: 'Wave Period',
      desc: 'The time in seconds between waves. Longer period (12s+) = clean, powerful energy from a distant swell. Short period (under 8s) = choppy local wind waves. Longer is better.',
    },
    {
      icon: '🌀',
      term: 'Swell',
      desc: 'Waves generated by storms far out at sea, not by local wind. Swell travels thousands of km before hitting the shore. Longer period swell = more organized, more powerful waves.',
    },
    {
      icon: '✅',
      term: 'Offshore Wind',
      desc: 'Wind blowing from the land out to sea. It holds up the wave face and grooms it into a clean wall. This is ideal surfing wind. Early mornings are often offshore.',
    },
    {
      icon: '💨',
      term: 'Onshore Wind',
      desc: 'Wind blowing from the sea towards the land — the opposite of offshore. It pushes into the back of the wave, making it messy and choppy. Harder to surf in onshore conditions.',
    },
    {
      icon: '✨',
      term: 'Glassy',
      desc: 'When the ocean surface is perfectly smooth, like a mirror. Usually happens at dawn before the sea breeze kicks in. Glassy waves are easier to read and surf.',
    },
    {
      icon: '🤙',
      term: 'Barrel / Tube',
      desc: 'A hollow wave that curls over to form a cylindrical tube of water. Getting "tubed" is the holy grail of surfing. Usually requires solid swell (1.5m+) and offshore wind. For experienced surfers.',
    },
    {
      icon: '⚠️',
      term: 'Closeout',
      desc: 'A wave that breaks all at once along its entire length, leaving no room to ride along the face. Common with big onshore swell. Looks impressive but is frustrating to surf.',
    },
    {
      icon: '📈',
      term: 'Set Waves',
      desc: 'The larger waves that arrive in groups every few minutes, separated by calmer periods (lulls). The best waves are usually in the sets. Experienced surfers sit outside waiting for them.',
    },
    {
      icon: '🚨',
      term: 'Rip Current',
      desc: 'A powerful channel of water flowing away from shore. If caught in one, stay calm and swim PARALLEL to the beach — never fight it directly. The rip will dissipate beyond the break.',
    },
    {
      icon: '🌅',
      term: 'Dawn Patrol',
      desc: 'A surf session at first light, just after sunrise. Often the best conditions of the day: glassy water, lighter winds, and fewer people in the lineup. Worth the early alarm.',
    },
  ],

  es: [
    {
      icon: '🎯',
      term: 'Score de Surf',
      desc: 'Nuestra calificación de 0 a 10 que combina altura de ola, período y viento. 10 es perfecto. Menos de 3 significa que está plano o muy picado. El score también se ajusta con reportes de la comunidad.',
    },
    {
      icon: '🌊',
      term: 'Altura de Ola',
      desc: 'La distancia vertical desde el valle (parte baja) hasta la cresta (parte alta) de la ola. De 1 a 2m es una buena sesión para la mayoría. Se muestra en metros.',
    },
    {
      icon: '⏱️',
      term: 'Período de Ola',
      desc: 'Los segundos entre ola y ola. Período largo (12s+) = energía limpia y potente de un swell lejano. Período corto (menos de 8s) = mar picado de viento local. Más largo es mejor.',
    },
    {
      icon: '🌀',
      term: 'Swell',
      desc: 'Olas generadas por tormentas lejos en el mar, no por el viento local. El swell viaja miles de km antes de llegar a la costa. Mayor período = olas más organizadas y poderosas.',
    },
    {
      icon: '✅',
      term: 'Viento Offshore',
      desc: 'Viento que sopla de la tierra hacia el mar. Sostiene la cara de la ola y la "peina", dándole una pared limpia. Condiciones ideales para surfear. Las mañanas suelen ser offshore.',
    },
    {
      icon: '💨',
      term: 'Viento Onshore',
      desc: 'Viento que sopla del mar hacia la tierra — lo opuesto al offshore. Empuja la parte de atrás de la ola, dejándola picada y desordenada. Más difícil de surfear con viento onshore.',
    },
    {
      icon: '✨',
      term: 'Cristalino / Glassy',
      desc: 'Cuando la superficie del mar está completamente lisa, como un espejo. Generalmente al amanecer, antes que entre la brisa marina. Las olas se ven y surfean mucho mejor así.',
    },
    {
      icon: '🤙',
      term: 'Tubo / Barrel',
      desc: 'Una ola hueca que curva sobre sí misma formando un cilindro de agua. Meterse en un tubo es el máximo del surf. Requiere buen swell (1.5m+) y viento offshore. Para surfistas experimentados.',
    },
    {
      icon: '⚠️',
      term: 'Cerrada / Closeout',
      desc: 'Una ola que rompe de punta a punta toda al mismo tiempo, sin dejar espacio para surfearla. Común con swell onshore grande. Se ve impresionante pero es imposible de surfear.',
    },
    {
      icon: '📈',
      term: 'Series / Sets',
      desc: 'Las olas más grandes que llegan en grupos cada varios minutos, separadas por períodos de calma. Las mejores olas suelen estar en los sets. Los surfistas experimentados esperan afuera para recibirlos.',
    },
    {
      icon: '🚨',
      term: 'Corriente de Retorno / Rip',
      desc: 'Una corriente fuerte que arrastra hacia afuera de la orilla. Si te atrapa, mantené la calma y nadá PARALELO a la playa — nunca contra ella directamente. La corriente se disipa más allá del rompiente.',
    },
    {
      icon: '🌅',
      term: 'Dawn Patrol',
      desc: 'Sesión de surf al amanecer, con la primera luz del día. Suelen ser las mejores condiciones: mar cristalino, vientos más livianos y menos gente en el lineup. Vale la pena madrugar.',
    },
  ],

  pt: [
    {
      icon: '🎯',
      term: 'Pontuação do Surf',
      desc: 'Nossa avaliação de 0 a 10 combinando altura da onda, período e vento. 10 é perfeito. Abaixo de 3 significa flat ou muito picado. A pontuação também ajusta com base nos reportes da comunidade.',
    },
    {
      icon: '🌊',
      term: 'Altura da Onda',
      desc: 'A distância vertical do vale (parte baixa) até a crista (parte alta) da onda. De 1 a 2m é uma boa sessão para a maioria. Exibido em metros.',
    },
    {
      icon: '⏱️',
      term: 'Período da Onda',
      desc: 'Os segundos entre uma onda e outra. Período longo (12s+) = energia limpa e potente de um swell distante. Período curto (menos de 8s) = mar picado de vento local. Quanto mais longo, melhor.',
    },
    {
      icon: '🌀',
      term: 'Swell',
      desc: 'Ondas geradas por tempestades no mar aberto, não pelo vento local. O swell viaja milhares de km antes de chegar à costa. Período maior = ondas mais organizadas e poderosas.',
    },
    {
      icon: '✅',
      term: 'Vento Offshore',
      desc: 'Vento soprando da terra para o mar. Segura a face da onda e a "penteia", criando uma parede limpa. Condições ideais para surfar. As manhãs costumam ser offshore.',
    },
    {
      icon: '💨',
      term: 'Vento Onshore',
      desc: 'Vento soprando do mar para a terra — o oposto do offshore. Empurra a parte de trás da onda, deixando-a picada e bagunçada. Mais difícil de surfar com vento onshore.',
    },
    {
      icon: '✨',
      term: 'Espelhado / Glassy',
      desc: 'Quando a superfície do mar está completamente lisa, como um espelho. Geralmente ao amanhecer, antes da brisa marinha. As ondas ficam muito mais legíveis e agradáveis de surfar.',
    },
    {
      icon: '🤙',
      term: 'Tubo / Barrel',
      desc: 'Uma onda oca que curva sobre si mesma formando um cilindro de água. Entrar em um tubo é o máximo do surf. Requer um bom swell (1.5m+) e vento offshore. Para surfistas experientes.',
    },
    {
      icon: '⚠️',
      term: 'Fechando / Closeout',
      desc: 'Uma onda que quebra de ponta a ponta toda de uma vez, sem espaço para surfar. Comum com swell onshore grande. Parece impressionante mas é frustrante de surfar.',
    },
    {
      icon: '📈',
      term: 'Séries / Sets',
      desc: 'As ondas maiores que chegam em grupos a cada poucos minutos, separadas por períodos de calmaria. As melhores ondas costumam estar nos sets. Surfistas experientes ficam fora esperando por elas.',
    },
    {
      icon: '🚨',
      term: 'Corrente de Retorno / Rip',
      desc: 'Uma corrente forte que puxa para longe da costa. Se pegar numa, mantenha a calma e nade PARALELO à praia — nunca contra ela diretamente. A corrente se dissipa além da arrebentação.',
    },
    {
      icon: '🌅',
      term: 'Dawn Patrol',
      desc: 'Uma sessão de surf ao amanhecer, com a primeira luz do dia. Geralmente as melhores condições: mar espelhado, ventos mais leves e menos gente no lineup. Vale a pena acordar cedo.',
    },
  ],
}

// Map backend English score labels → translation keys
export const SCORE_LABEL_KEY = {
  Flat: 'score.flat',
  Poor: 'score.poor',
  Fair: 'score.fair',
  Good: 'score.good',
  Epic: 'score.epic',
}
