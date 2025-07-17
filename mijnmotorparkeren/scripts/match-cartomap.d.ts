import { Gemeente } from '../src/types/gemeente';
interface CartomapFeature {
    type: 'Feature';
    properties: {
        statcode: string;
        statnaam: string;
        jrstatcode: string;
        rubriek: string;
        id: number;
    };
    geometry: {
        type: 'Polygon';
        coordinates: number[][][];
    };
    id: string;
}
declare function matchGemeenteToCartomap(gemeenteData: Gemeente, cartomapFeatures: CartomapFeature[]): CartomapFeature | null;
declare function updateGemeenteData(): Promise<void>;
export { updateGemeenteData, matchGemeenteToCartomap };
