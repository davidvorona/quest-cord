import CombatEncounter from "./combat/CombatEncounter";
import Encounter from "./Encounter";
import LookoutEncounter from "./lookout/LookoutEncounter";
import MerchantEncounter from "./merchant/MerchantEncounter";
import RestEncounter from "./rest/RestEncounter";
import SocialEncounter from "./social/SocialEncounter";
import StealthEncounter from "./stealth/StealthEncounter";
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
