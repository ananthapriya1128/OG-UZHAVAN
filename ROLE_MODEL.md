# Role and district model

| Role | Scope | Custom claims |
|---|---|---|
| DPC officer | Their assigned procurement centre | `role: dpc_officer`, `dpcId` |
| District officer | Documents whose `districtId` equals their district | `role: district_officer`, `districtId` |
| State admin | Statewide aggregates and records | `role: state_admin` |

The browser must never be the authority for a role. An administrator sets Firebase Auth custom claims through a protected administrative process. Firestore rules enforce the same district restriction, so hiding a menu item is not relied on for access control.

Every farmer, booking, grievance, and DPC document must include `districtId` before district-scoped production queries are enabled.
