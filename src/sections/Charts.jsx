import { ParameterCard } from './ParameterCard'
import { PARAMETERS } from '../core/ensemble'

/**
 * The four detailed charts, in their own module so the charting library is
 * downloaded only by readers who open them.
 */
export default function Charts({ data, system, todayIdx, nowIdx }) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {PARAMETERS.map((parameter) => (
        <ParameterCard
          key={parameter.id}
          parameter={parameter}
          data={data}
          system={system}
          todayIdx={todayIdx}
          nowIdx={nowIdx}
        />
      ))}
    </div>
  )
}
