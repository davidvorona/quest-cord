import CombatEncounter from "./CombatEncounter";
import Encounter from "./Encounter";
import LookoutEncounter from "./LookoutEncounter";
import MerchantEncounter from "./MerchantEncounter";
import RestEncounter from "./RestEncounter";
import SocialEncounter from "./SocialEncounter";
import StealthEncounter from "./StealthEncounter";
import TurnBasedEncounter from "./TurnBasedEncounter";

// Returns an array of all Encounter classes so commands service
// can easily get static encounter commands to register.
export default [
    Encounter,
    CombatEncounter,
    LookoutEncounter,
    MerchantEncounter,
    RestEncounter,
    SocialEncounter,
    StealthEncounter,
    TurnBasedEncounter
];
