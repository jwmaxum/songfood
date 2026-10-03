export default function FieldError({name,errors}:{name:string;errors:Record<string,string>}) {
  return errors[name]?<p id={'error-'+name} role="alert" className="mt-2 text-xs text-red-800">{errors[name]}</p>:null;
}
