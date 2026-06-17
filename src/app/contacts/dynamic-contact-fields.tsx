import React from 'react'

export function renderContactField(fieldKey: string, label: string, contact: any = {}, dictionary: any[] = []) {
  // Détermine la largeur de colonne en fonction du champ pour garder le design original
  const fullWidthFields = ['usageName', 'streetName', 'email']

  return (
    <React.Fragment key={fieldKey}>
      {fieldKey === 'gender' && (
        <div className="form-group">
          <label htmlFor="gender">{label}</label>
          <select id="gender" name="gender" className="form-control" defaultValue={contact.gender || ''}>
            <option value="">Non renseigné</option>
            <option value="H">Homme (H)</option>
            <option value="F">Femme (F)</option>
            <option value="Autre">Autre</option>
          </select>
        </div>
      )}
      
      {fieldKey === 'birthDate' && (
        <div className="form-group">
          <label htmlFor="birthDate">{label}</label>
          <input type="date" id="birthDate" name="birthDate" className="form-control" defaultValue={contact.birthDate ? new Date(contact.birthDate).toISOString().split('T')[0] : ''} />
        </div>
      )}

      {fieldKey === 'firstName' && (
        <div className="form-group">
          <label htmlFor="firstName">{label} *</label>
          <input type="text" id="firstName" name="firstName" className="form-control" defaultValue={contact.firstName || ''} required />
        </div>
      )}

      {fieldKey === 'lastName' && (
        <div className="form-group">
          <label htmlFor="lastName">{label} *</label>
          <input type="text" id="lastName" name="lastName" className="form-control" defaultValue={contact.lastName || ''} required />
        </div>
      )}

      {fieldKey === 'usageName' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="usageName">{label}</label>
          <input type="text" id="usageName" name="usageName" className="form-control" defaultValue={contact.usageName || ''} placeholder="Optionnel" />
        </div>
      )}

      {fieldKey === 'nationality' && (
        <div className="form-group">
          <label htmlFor="nationality">{label}</label>
          <input type="text" id="nationality" name="nationality" className="form-control" defaultValue={contact.nationality || ''} />
        </div>
      )}

      {fieldKey === 'building' && (
        <div className="form-group">
          <label htmlFor="building">{label}</label>
          <input type="text" id="building" name="building" className="form-control" defaultValue={contact.building || ''} />
        </div>
      )}

      {fieldKey === 'streetNumber' && (
        <div className="form-group">
          <label htmlFor="streetNumber">{label}</label>
          <input type="text" id="streetNumber" name="streetNumber" className="form-control" defaultValue={contact.streetNumber || ''} />
        </div>
      )}

      {fieldKey === 'streetName' && (
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label htmlFor="streetName">{label}</label>
          <input type="text" id="streetName" name="streetName" className="form-control" defaultValue={contact.streetName || ''} />
        </div>
      )}

      {fieldKey === 'postalCode' && (
        <div className="form-group">
          <label htmlFor="postalCode">{label}</label>
          <input type="text" id="postalCode" name="postalCode" className="form-control" defaultValue={contact.postalCode || ''} />
        </div>
      )}

      {fieldKey === 'city' && (
        <div className="form-group">
          <label htmlFor="city">{label}</label>
          <input type="text" id="city" name="city" className="form-control" defaultValue={contact.city || ''} />
        </div>
      )}

      {fieldKey === 'buildingType' && (
        <div className="form-group">
          <label htmlFor="buildingType">{label}</label>
          <input type="text" id="buildingType" name="buildingType" className="form-control" defaultValue={contact.buildingType || ''} />
        </div>
      )}

      {fieldKey === 'floor' && (
        <div className="form-group">
          <label htmlFor="floor">{label}</label>
          <input type="text" id="floor" name="floor" className="form-control" defaultValue={contact.floor || ''} />
        </div>
      )}

      {fieldKey === 'door' && (
        <div className="form-group">
          <label htmlFor="door">{label}</label>
          <input type="text" id="door" name="door" className="form-control" defaultValue={contact.door || ''} />
        </div>
      )}
    </React.Fragment>
  )
}
