<?php
if (!defined('ABSPATH')) exit;

/**
 * Liste des championnats et compétitions suivis par CSport.
 * Utilisé par le shortcode [championnats_list] et pour d'autres catalogues éventuels.
 *
 * Chaque entrée contient :
 *  - group   : libellé de la catégorie
 *  - note    : texte optionnel affiché au survol
 *  - items[] : tableau d'éléments { id:int|null, label:string, description?:string }
 *
 * Les IDs null correspondent à des compétitions sans identifiant API-Football (ex: Supercoupe locale).
 */
function cslf_followed_league_groups() {
    return [
        [
            'group' => __('Maroc - Sélections', 'csport-live-foot'),
            'items' => [
                ['id' => 6,   'label' => "Coupe d'Afrique des Nations (CAN)"],
                ['id' => 19,  'label' => 'CHAN (Championnat d’Afrique des Nations)'],
                ['id' => 29,  'label' => 'Qualifications Coupe du Monde - Afrique'],
                ['id' => 1,   'label' => 'Coupe du Monde'],
            ],
        ],
        [
            'group' => __('Maroc - Compétitions locales', 'csport-live-foot'),
            'items' => [
                ['id' => 200, 'label' => 'Botola Pro', 'description' => __('Championnat du Maroc', 'csport-live-foot')],
                ['id' => 822, 'label' => 'Coupe du Trône'],
                ['id' => null, 'label' => 'Supercoupe du Maroc'],
            ],
        ],
        [
            'group' => __('Afrique - Clubs', 'csport-live-foot'),
            'items' => [
                ['id' => 12,  'label' => 'CAF Champions League'],
                ['id' => 20,  'label' => 'CAF Confederation Cup'],
                ['id' => 533, 'label' => 'CAF Super Cup'],
                ['id' => 1043,'label' => 'African Football League'],
                ['id' => 1164,'label' => "CAF Women's Champions League"],
            ],
        ],
        [
            'group' => __('Compétitions arabes', 'csport-live-foot'),
            'items' => [
                ['id' => 768, 'label' => 'Arab Club Champions Cup'],
                ['id' => 860, 'label' => 'Arab Cup (sélections)'],
            ],
        ],
        [
            'group' => __('Arabie saoudite', 'csport-live-foot'),
            'items' => [
                ['id' => 307, 'label' => 'Saudi Pro League (Roshn)'],
            ],
        ],
        [
            'group' => __('Grands championnats européens', 'csport-live-foot'),
            'items' => [
                ['id' => 140, 'label' => 'La Liga', 'country' => 'Espagne'],
                ['id' => 39,  'label' => 'Premier League', 'country' => 'Angleterre'],
                ['id' => 135, 'label' => 'Serie A', 'country' => 'Italie'],
                ['id' => 78,  'label' => 'Bundesliga', 'country' => 'Allemagne'],
                ['id' => 61,  'label' => 'Ligue 1', 'country' => 'France'],
            ],
        ],
        [
            'group' => __('UEFA - Clubs', 'csport-live-foot'),
            'items' => [
                ['id' => 2,   'label' => 'Ligue des Champions UEFA'],
                ['id' => 3,   'label' => 'Ligue Europa UEFA'],
                ['id' => 848, 'label' => 'UEFA Europa Conference League'],
                ['id' => 531, 'label' => 'Supercoupe d’Europe'],
                ['id' => 525, 'label' => 'Ligue des Champions (F)'],
                ['id' => 743, 'label' => 'Euro Féminin'],
                ['id' => 1040,'label' => 'Ligue des Nations (F)'],
            ],
        ],
        [
            'group' => __('UEFA - Sélections', 'csport-live-foot'),
            'items' => [
                ['id' => 4, 'label' => "Euro (Championnat d'Europe)"],
                ['id' => 5, 'label' => 'UEFA Nations League'],
            ],
        ],
        [
            'group' => __('Compétitions FIFA & JO', 'csport-live-foot'),
            'items' => [
                ['id' => 29,  'label' => 'Qualifications Coupe du Monde - Afrique'],
                ['id' => 1,   'label' => 'Coupe du Monde'],
                ['id' => 15,  'label' => 'Coupe du Monde des Clubs'],
                ['id' => 37,  'label' => 'Barrages intercontinentaux Coupe du Monde'],
                ['id' => 30,  'label' => 'Qualifications Coupe du Monde - Asie'],
                ['id' => 31,  'label' => 'Qualifications Coupe du Monde - CONCACAF'],
                ['id' => 32,  'label' => 'Qualifications Coupe du Monde - Europe'],
                ['id' => 33,  'label' => 'Qualifications Coupe du Monde - Océanie'],
                ['id' => 34,  'label' => 'Qualifications Coupe du Monde - Amérique du Sud'],
                ['id' => 480, 'label' => 'Jeux Olympiques (Hommes)'],
                ['id' => 524, 'label' => 'Jeux Olympiques (Femmes)'],
            ],
        ],
        [
            'group' => __('CONMEBOL', 'csport-live-foot'),
            'items' => [
                ['id' => 9,  'label' => 'Copa América'],
                ['id' => 13, 'label' => 'CONMEBOL Libertadores'],
                ['id' => 11, 'label' => 'CONMEBOL Sudamericana'],
            ],
        ],
        [
            'group' => __('Asie (AFC)', 'csport-live-foot'),
            'items' => [
                ['id' => 7,  'label' => 'Asian Cup'],
                ['id' => 35, 'label' => 'Qualifications Asian Cup'],
                ['id' => 18, 'label' => 'AFC Cup'],
            ],
        ],
        [
            'group' => __('CONCACAF', 'csport-live-foot'),
            'items' => [
                ['id' => 22,  'label' => 'Gold Cup'],
                ['id' => 16,  'label' => 'CONCACAF Champions Cup'],
                ['id' => 536, 'label' => 'CONCACAF Nations League'],
            ],
        ],
        [
            'group' => __('Océanie (OFC)', 'csport-live-foot'),
            'items' => [
                ['id' => 27, 'label' => 'OFC Champions League'],
            ],
        ],
    ];
}

/**
 * Retourne les IDs de ligues suivies (uniques, non nuls).
 * @return array<int>
 */
function cslf_followed_league_ids() {
    $ids = [];
    foreach (cslf_followed_league_groups() as $group) {
        foreach ($group['items'] as $item) {
            if (!empty($item['id'])) {
                $ids[$item['id']] = true;
            }
        }
    }
    return array_keys($ids);
}

