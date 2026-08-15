import { useEffect, useState } from 'react'
import { Folder, Heart, Plus, ExternalLink, Github, Users } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/Avatar'
import { SkeletonList } from '@/components/Skeleton'
import { EmptyState, ErrorState } from '@/components/States'
import { Sheet } from '@/components/Sheet'
import { fetchProjects, createProject, expressProjectInterest } from '@/lib/data'
import { formatNumber } from '@/lib/utils'
import type { Project } from '@/types'

export function Projects() {
  const { user } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formTitle, setFormTitle] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formTech, setFormTech] = useState('')
  const [formUrl, setFormUrl] = useState('')
  const [formGithub, setFormGithub] = useState('')
  const [formTeammates, setFormTeammates] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchProjects()
      .then(setProjects)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  const resetForm = () => {
    setFormTitle('')
    setFormDesc('')
    setFormTech('')
    setFormUrl('')
    setFormGithub('')
    setFormTeammates(false)
  }

  const handleSubmit = async () => {
    if (!user || !formTitle.trim() || !formDesc.trim()) return
    setSubmitting(true)
    try {
      const techs = formTech.split(',').map(s => s.trim()).filter(Boolean)
      const project = await createProject(
        user.id,
        formTitle.trim(),
        formDesc.trim(),
        techs,
        formUrl.trim() || undefined,
        formGithub.trim() || undefined,
        formTeammates,
      )
      setProjects(prev => [project, ...prev])
      resetForm()
      setSheetOpen(false)
    } catch {
      // keep sheet open
    } finally {
      setSubmitting(false)
    }
  }

  const handleInterest = async (projectId: string) => {
    if (!user) return
    try {
      await expressProjectInterest(projectId, user.id)
      alert('Interest expressed! The project owner will be notified.')
    } catch {
      // silent
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Projects</h1>
          <p className="text-gray-500 text-sm mt-0.5">Explore campus projects and find collaborators</p>
        </div>
        {user && (
          <button
            onClick={() => setSheetOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zeal-500 text-white text-sm font-medium hover:bg-zeal-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New
          </button>
        )}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error ? (
        <ErrorState onRetry={() => window.location.reload()} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={<Folder className="w-7 h-7" />}
          title="No projects yet"
          description="Be the first to share a project with your campus."
          action={user ? (
            <button onClick={() => setSheetOpen(true)} className="btn-primary text-sm">
              Create Project
            </button>
          ) : undefined}
        />
      ) : (
        <div className="space-y-3">
          {projects.map(pj => (
            <div key={pj.id} className="card p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Avatar src={pj.owner?.avatar_url} alt={pj.owner?.full_name || 'U'} size="sm" />
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold">{pj.title}</h3>
                  <p className="text-gray-500 text-xs mt-0.5">{pj.owner?.full_name}</p>
                </div>
              </div>

              {pj.description && (
                <p className="text-gray-400 text-sm line-clamp-3">{pj.description}</p>
              )}

              {pj.technologies && pj.technologies.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {pj.technologies.map(tech => (
                    <span key={tech} className="px-2 py-0.5 rounded-full bg-ink-800 text-gray-400 text-xs border border-ink-700">
                      {tech}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Heart className="w-3.5 h-3.5" />
                    {formatNumber(pj.like_count)}
                  </span>
                  {pj.looking_for_teammates && (
                    <span className="flex items-center gap-1.5 text-xs text-zeal-400">
                      <Users className="w-3.5 h-3.5" />
                      Looking for teammates
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {pj.project_url && (
                    <a href={pj.project_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-ink-800 text-gray-400 hover:text-white transition-colors">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {pj.github_url && (
                    <a href={pj.github_url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-ink-800 text-gray-400 hover:text-white transition-colors">
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {user && pj.looking_for_teammates && (
                    <button
                      onClick={() => handleInterest(pj.id)}
                      className="px-3 py-1.5 rounded-xl bg-zeal-500/10 text-zeal-400 text-xs font-medium hover:bg-zeal-500/20 transition-colors"
                    >
                      I'm interested
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onClose={() => { setSheetOpen(false); resetForm() }} title="New Project">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Title</label>
            <input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
              placeholder="Project name"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Description</label>
            <textarea
              value={formDesc}
              onChange={e => setFormDesc(e.target.value)}
              placeholder="What does this project do?"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Technologies (comma-separated)</label>
            <input
              value={formTech}
              onChange={e => setFormTech(e.target.value)}
              placeholder="React, TypeScript, Supabase"
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Project URL</label>
            <input
              value={formUrl}
              onChange={e => setFormUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">GitHub URL</label>
            <input
              value={formGithub}
              onChange={e => setFormGithub(e.target.value)}
              placeholder="https://github.com/..."
              className="w-full px-3 py-2.5 rounded-xl bg-ink-800 border border-ink-700 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-zeal-500"
            />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <div className={`w-10 h-6 rounded-full transition-colors relative ${formTeammates ? 'bg-zeal-500' : 'bg-ink-700'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${formTeammates ? 'left-5' : 'left-1'}`} />
            </div>
            <span className="text-sm text-gray-300">Looking for teammates</span>
          </label>
          <button
            onClick={handleSubmit}
            disabled={!formTitle.trim() || !formDesc.trim() || submitting}
            className="w-full py-2.5 rounded-xl bg-zeal-500 text-white font-medium text-sm hover:bg-zeal-600 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </Sheet>
    </div>
  )
}
